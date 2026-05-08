"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function removeMessage(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const messageId = formData.get("messageId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.chatMessage.updateMany({
    where: { id: messageId, eventId },
    data: { removedAt: new Date() },
  });
  revalidatePath(`/admin/eventos/${eventId}/chat`);
  return { ok: true };
}

export async function restoreMessage(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const messageId = formData.get("messageId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.chatMessage.updateMany({
    where: { id: messageId, eventId },
    data: { removedAt: null },
  });
  revalidatePath(`/admin/eventos/${eventId}/chat`);
  return { ok: true };
}

export async function silenceGuest(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const guestId = formData.get("guestId") as string;
  const ban = formData.get("ban") !== "false";
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.guest.updateMany({
    where: { id: guestId, eventId },
    data: { banned: ban },
  });
  revalidatePath(`/admin/eventos/${eventId}/chat`);
  return { ok: true };
}
