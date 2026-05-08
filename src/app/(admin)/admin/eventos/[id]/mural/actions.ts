"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function approvePhoto(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const photoId = formData.get("photoId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.photo.update({ where: { id: photoId }, data: { approvedByCouple: true } });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true };
}

export async function removePhoto(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const photoId = formData.get("photoId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.photo.update({ where: { id: photoId }, data: { removedAt: new Date() } });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true };
}
