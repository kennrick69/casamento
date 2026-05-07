"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

async function authForEvent(eventId: string) {
  await requireOrganizer(eventId);
}

export async function toggleGuestBan(formData: FormData) {
  const guestId = formData.get("guestId") as string;
  const eventId = formData.get("eventId") as string;
  await authForEvent(eventId);

  const guest = await prisma.guest.findUnique({ where: { id: guestId }, select: { banned: true } });
  if (!guest) return;

  await prisma.guest.update({ where: { id: guestId }, data: { banned: !guest.banned } });
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
}

export async function removeGuest(formData: FormData) {
  const guestId = formData.get("guestId") as string;
  const eventId = formData.get("eventId") as string;
  await authForEvent(eventId);

  await prisma.guest.update({
    where: { id: guestId },
    data: { deletedAt: new Date(), name: "Dados removidos", email: `removed_${guestId}@deleted.invalid` },
  });
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
}
