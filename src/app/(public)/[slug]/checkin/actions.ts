"use server";

import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { awardPoints } from "@/lib/points";

export interface CheckinResult {
  ok: boolean;
  message: string;
  points?: number;
}

export async function doCheckin(formData: FormData): Promise<CheckinResult> {
  const slug = formData.get("slug") as string;
  const code = (formData.get("code") as string)?.trim().toUpperCase();

  if (!slug || !code) return { ok: false, message: "Código inválido." };

  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, message: "Você precisa confirmar presença primeiro." };
  if (guest.banned) return { ok: false, message: "Conta suspensa." };

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return { ok: false, message: "Evento não encontrado." };

  const checkinCode = await prisma.checkinCode.findUnique({
    where: { eventId_code: { eventId: event.id, code } },
    include: { mission: true },
  });

  if (!checkinCode || !checkinCode.active) {
    return { ok: false, message: "Código não encontrado ou inválido." };
  }

  const now = new Date();
  if (checkinCode.validFrom && now < checkinCode.validFrom) {
    return { ok: false, message: "Este código ainda não está ativo." };
  }
  if (checkinCode.validUntil && now > checkinCode.validUntil) {
    return { ok: false, message: "Este código expirou." };
  }

  // Prevent duplicate check-in with same code
  const alreadyCheckedIn = await prisma.checkin.findFirst({
    where: { guestId: guest.id, codeId: checkinCode.id },
  });
  if (alreadyCheckedIn) {
    return { ok: false, message: "Você já usou este código." };
  }

  await prisma.checkin.create({
    data: { eventId: event.id, guestId: guest.id, codeId: checkinCode.id },
  });

  if (checkinCode.mission) {
    const result = await awardPoints(guest.id, event.id, checkinCode.mission.code);
    if (result.awarded) {
      return { ok: true, message: "Presença marcada! 🎉", points: result.points };
    }
  }

  return { ok: true, message: "Presença marcada! 🎉" };
}
