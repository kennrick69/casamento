import "server-only";
import { prisma } from "@/lib/db";
import { firstName } from "@/lib/game/identity";

// ─── S4b · Escolha de lugar (cadeiras do salão) ─────────────────────────────
// A cadeira é (tableId, seatIndex), 0..capacity-1. Um convidado escolhe uma mesa
// com lugares livres suficientes para ele + a família (acompanhantes do S2); o
// sistema reserva as cadeiras livres mais baixas para o grupo. Cadeira ocupada
// por outro ou travada pelo organizador não conta como livre.

export type SeatState = "free" | "mine" | "taken" | "locked";
export interface SeatCell {
  index: number;
  state: SeatState;
  label: string | null; // nome do ocupante (taken/mine)
}
export interface TableSeatMap {
  tableId: string;
  capacity: number;
  cells: SeatCell[]; // length = capacity
  freeCount: number;
}

type SeatRow = {
  tableId: string;
  seatIndex: number;
  guestId: string | null;
  companionId: string | null;
  claimedById: string | null;
  holderName: string | null;
  locked: boolean;
};

function buildCells(capacity: number, rows: SeatRow[], myGuestId: string | null): SeatSummary {
  const byIndex = new Map<number, SeatRow>();
  for (const r of rows) byIndex.set(r.seatIndex, r);
  const cells: SeatCell[] = [];
  let free = 0;
  for (let i = 0; i < capacity; i++) {
    const r = byIndex.get(i);
    if (!r) {
      cells.push({ index: i, state: "free", label: null });
      free++;
      continue;
    }
    if (r.locked && !r.guestId && !r.companionId) {
      cells.push({ index: i, state: "locked", label: null });
      continue;
    }
    const mine = !!myGuestId && (r.guestId === myGuestId || r.claimedById === myGuestId);
    cells.push({ index: i, state: mine ? "mine" : "taken", label: r.holderName ?? null });
  }
  return { cells, freeCount: free };
}
interface SeatSummary {
  cells: SeatCell[];
  freeCount: number;
}

// Mapa de cadeiras de TODAS as mesas do evento + qual mesa é a "minha".
export async function getEventSeatMaps(
  eventId: string,
  myGuestId: string | null,
): Promise<{ maps: Record<string, TableSeatMap>; myTableId: string | null }> {
  const [tables, seats] = await Promise.all([
    prisma.seatingTable.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      select: { id: true, capacity: true },
    }),
    prisma.seat.findMany({
      where: { eventId },
      select: {
        tableId: true,
        seatIndex: true,
        guestId: true,
        companionId: true,
        claimedById: true,
        holderName: true,
        locked: true,
      },
    }),
  ]);

  const byTable = new Map<string, SeatRow[]>();
  for (const s of seats) {
    const arr = byTable.get(s.tableId) ?? [];
    arr.push(s);
    byTable.set(s.tableId, arr);
  }

  let myTableId: string | null = null;
  const maps: Record<string, TableSeatMap> = {};
  for (const t of tables) {
    const rows = byTable.get(t.id) ?? [];
    const { cells, freeCount } = buildCells(t.capacity, rows, myGuestId);
    maps[t.id] = { tableId: t.id, capacity: t.capacity, cells, freeCount };
    if (myGuestId && rows.some((r) => r.guestId === myGuestId || r.claimedById === myGuestId)) {
      myTableId = t.id;
    }
  }
  return { maps, myTableId };
}

export interface ChooseResult {
  ok: boolean;
  message?: string;
  tableId?: string;
  indices?: number[];
}

// Reserva as cadeiras livres mais baixas da mesa para o convidado + família.
// Idempotente por grupo: re-escolher solta as cadeiras antigas do grupo antes.
export async function chooseSeatsForGuest(
  eventId: string,
  guestId: string,
  tableId: string,
): Promise<ChooseResult> {
  const [guest, table, companions] = await Promise.all([
    prisma.guest.findFirst({
      where: { id: guestId, eventId },
      select: { id: true, name: true, playerName: true },
    }),
    prisma.seatingTable.findFirst({ where: { id: tableId, eventId }, select: { id: true, capacity: true } }),
    // Bebê de colo (lapInfant) não ocupa cadeira — fica de fora da reserva.
    prisma.guestCompanion.findMany({
      where: { guestId, lapInfant: false },
      select: { id: true, name: true },
    }),
  ]);
  if (!guest) return { ok: false, message: "Convidado não encontrado." };
  if (!table) return { ok: false, message: "Mesa não encontrada." };

  const partySize = 1 + companions.length;
  if (partySize > table.capacity) {
    return { ok: false, message: "Sua família não cabe nesta mesa." };
  }

  try {
    const indices = await prisma.$transaction(async (tx) => {
      // 1) solta as cadeiras atuais do grupo (re-escolha) — em qualquer mesa
      await tx.seat.deleteMany({
        where: { eventId, OR: [{ claimedById: guestId }, { guestId }] },
      });
      // 2) recomputa cadeiras ocupadas/travadas da mesa alvo (já sem as do grupo)
      const occupied = await tx.seat.findMany({
        where: { tableId },
        select: { seatIndex: true },
      });
      const taken = new Set(occupied.map((o) => o.seatIndex));
      const free: number[] = [];
      for (let i = 0; i < table.capacity && free.length < partySize; i++) {
        if (!taken.has(i)) free.push(i);
      }
      if (free.length < partySize) {
        throw new SeatFullError();
      }
      // 3) cria as cadeiras: 1ª para o convidado, demais para os acompanhantes
      const myLabel = firstName(guest.playerName || guest.name);
      await tx.seat.create({
        data: {
          eventId,
          tableId,
          seatIndex: free[0],
          guestId,
          claimedById: guestId,
          holderName: myLabel,
          source: "guest",
        },
      });
      for (let k = 0; k < companions.length; k++) {
        await tx.seat.create({
          data: {
            eventId,
            tableId,
            seatIndex: free[k + 1],
            companionId: companions[k].id,
            claimedById: guestId,
            holderName: firstName(companions[k].name),
            source: "guest",
          },
        });
      }
      // 4) mantém a alocação grossa (SeatingAssignment) em sincronia
      await tx.seatingAssignment.upsert({
        where: { guestId },
        create: { tableId, guestId },
        update: { tableId },
      });
      return free;
    });
    return { ok: true, tableId, indices };
  } catch (e) {
    if (e instanceof SeatFullError) {
      return { ok: false, message: "Alguém acabou de ocupar esses lugares. Tente outra mesa." };
    }
    // colisão de índice (corrida) ou outro → mensagem amigável
    return { ok: false, message: "Não deu para reservar agora. Tente de novo." };
  }
}

class SeatFullError extends Error {}
