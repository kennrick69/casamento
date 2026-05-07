"use server";

import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { revalidatePath } from "next/cache";

export async function reserveGift(formData: FormData) {
  const giftId = formData.get("giftId") as string;
  const slug = formData.get("slug") as string;

  const guest = await getCurrentGuest(slug);
  if (!guest || guest.rsvpStatus !== "CONFIRMED") return;

  const gift = await prisma.gift.findUnique({ where: { id: giftId } });
  if (!gift || gift.fulfilled) return;

  if (gift.reservedByGuestId === guest.id) {
    // Cancela reserva
    await prisma.gift.update({
      where: { id: giftId },
      data: { reservedByGuestId: null, reservedAt: null },
    });
  } else if (!gift.reservedByGuestId) {
    // Reserva
    await prisma.gift.update({
      where: { id: giftId },
      data: { reservedByGuestId: guest.id, reservedAt: new Date() },
    });
  }

  revalidatePath(`/${slug}/presentes`);
}
