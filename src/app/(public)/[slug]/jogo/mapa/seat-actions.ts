"use server";

import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";
import { chooseSeatsForGuest, getEventSeatMaps, type TableSeatMap } from "@/lib/game/seats";

export interface ChooseSeatResponse {
  ok: boolean;
  message?: string;
  myTableId?: string | null;
  maps?: Record<string, TableSeatMap>;
}

// S4b: o convidado escolhe (no jogo) uma mesa com lugares livres para ele + a
// família. Reserva as cadeiras e devolve o mapa de cadeiras atualizado de TODAS
// as mesas, para o canvas redesenhar na hora (cadeira ocupada some para os outros).
export async function chooseSeat(slug: string, tableId: string): Promise<ChooseSeatResponse> {
  const event = await getGameEvent(slug);
  if (!event) return { ok: false, message: "Evento não encontrado." };
  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, message: "Entre no jogo para escolher o seu lugar." };
  if (guest.isVisitor) {
    return { ok: false, message: "Visitantes não escolhem lugar — aproveite para explorar o salão!" };
  }

  const res = await chooseSeatsForGuest(event.id, guest.id, tableId);
  if (!res.ok) return { ok: false, message: res.message };

  const { maps, myTableId } = await getEventSeatMaps(event.id, guest.id);
  return { ok: true, myTableId, maps };
}
