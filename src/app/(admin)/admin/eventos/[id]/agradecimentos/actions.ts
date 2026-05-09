"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function saveThankYou(
  eventId: string,
  guestId: string,
  giftReceived: string,
  thankYouNote: string,
  thankYouSent: boolean
): Promise<{ ok: boolean }> {
  await requireOrganizer(eventId);
  await prisma.guest.update({
    where: { id: guestId },
    data: {
      giftReceived: giftReceived || null,
      thankYouNote: thankYouNote || null,
      thankYouSent,
    },
  });
  revalidatePath(`/admin/eventos/${eventId}/agradecimentos`);
  return { ok: true };
}

export async function markThankYouSent(eventId: string, guestId: string, sent: boolean): Promise<{ ok: boolean }> {
  await requireOrganizer(eventId);
  await prisma.guest.update({ where: { id: guestId }, data: { thankYouSent: sent } });
  revalidatePath(`/admin/eventos/${eventId}/agradecimentos`);
  return { ok: true };
}
