"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function approvePhoto(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const photoId = formData.get("photoId") as string;
  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.photo.update({ where: { id: photoId }, data: { approvedByCouple: true } });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
}

export async function removePhoto(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const photoId = formData.get("photoId") as string;
  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.photo.update({ where: { id: photoId }, data: { removedAt: new Date() } });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
}
