"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { chooseSeatsForGuest } from "@/lib/game/seats";
import { revalidatePath } from "next/cache";

async function revalidate(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}/mesas`);
}

export async function createTable(eventId: string, name: string, capacity: number) {
  await requireOrganizer(eventId);
  const count = await prisma.seatingTable.count({ where: { eventId } });
  await prisma.seatingTable.create({ data: { eventId, name, capacity, order: count } });
  await revalidate(eventId);
  return { ok: true };
}

export async function deleteTable(eventId: string, tableId: string) {
  await requireOrganizer(eventId);
  await prisma.seatingTable.delete({ where: { id: tableId, eventId } });
  await revalidate(eventId);
  return { ok: true };
}

export async function assignGuest(eventId: string, tableId: string, guestId: string) {
  await requireOrganizer(eventId);
  await prisma.seatingAssignment.upsert({
    where: { guestId },
    create: { tableId, guestId },
    update: { tableId },
  });
  await revalidate(eventId);
  return { ok: true };
}

export async function unassignGuest(eventId: string, guestId: string) {
  await requireOrganizer(eventId);
  await prisma.seatingAssignment.deleteMany({ where: { guestId } });
  await revalidate(eventId);
  return { ok: true };
}

export async function updateTableName(eventId: string, tableId: string, name: string, capacity: number) {
  await requireOrganizer(eventId);
  await prisma.seatingTable.update({ where: { id: tableId, eventId }, data: { name, capacity } });
  await revalidate(eventId);
  return { ok: true };
}

// ── S4b (lado organizador): travar/soltar cadeiras e mover/liberar reservas ──

// Trava (indisponibiliza) ou destrava uma cadeira específica. Só funciona em
// cadeira LIVRE (sem convidado/acompanhante) — não derruba quem já escolheu.
export async function setSeatLock(eventId: string, tableId: string, seatIndex: number, locked: boolean) {
  await requireOrganizer(eventId);
  const table = await prisma.seatingTable.findFirst({ where: { id: tableId, eventId }, select: { id: true } });
  if (!table) return { ok: false, message: "Mesa não encontrada." };
  const existing = await prisma.seat.findUnique({
    where: { tableId_seatIndex: { tableId, seatIndex } },
    select: { id: true, guestId: true, companionId: true, locked: true },
  });
  if (locked) {
    if (existing && (existing.guestId || existing.companionId)) {
      return { ok: false, message: "Essa cadeira está ocupada por um convidado." };
    }
    if (existing) {
      await prisma.seat.update({ where: { id: existing.id }, data: { locked: true, source: "organizer", holderName: null } });
    } else {
      await prisma.seat.create({ data: { eventId, tableId, seatIndex, locked: true, source: "organizer" } });
    }
  } else {
    // destravar: remove a cadeira só se for um lock (não um convidado)
    if (existing && !existing.guestId && !existing.companionId) {
      await prisma.seat.delete({ where: { id: existing.id } });
    }
  }
  await revalidate(eventId);
  return { ok: true };
}

// Libera a reserva de uma família inteira (o convidado + acompanhantes) de uma mesa.
export async function releaseGuestSeats(eventId: string, guestId: string) {
  await requireOrganizer(eventId);
  await prisma.$transaction([
    prisma.seat.deleteMany({ where: { eventId, OR: [{ claimedById: guestId }, { guestId }] } }),
    prisma.seatingAssignment.deleteMany({ where: { guestId } }),
  ]);
  await revalidate(eventId);
  return { ok: true };
}

// Move a família de um convidado para outra mesa (reserva as cadeiras livres lá).
export async function moveGuestSeats(eventId: string, guestId: string, toTableId: string) {
  await requireOrganizer(eventId);
  const res = await chooseSeatsForGuest(eventId, guestId, toTableId);
  await revalidate(eventId);
  return res;
}
