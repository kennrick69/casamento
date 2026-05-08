"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function approvePhoto(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const photoId = formData.get("photoId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.photo.updateMany({ where: { id: photoId, eventId }, data: { approvedByCouple: true } });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true };
}

export async function removePhoto(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const photoId = formData.get("photoId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.photo.updateMany({ where: { id: photoId, eventId }, data: { removedAt: new Date() } });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true };
}

export async function batchApprovePhotos(formData: FormData): Promise<{ ok: boolean; count: number }> {
  const eventId = formData.get("eventId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false, count: 0 }; }

  const result = await prisma.photo.updateMany({
    where: { eventId, removedAt: null, approvedByCouple: false },
    data: { approvedByCouple: true },
  });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true, count: result.count };
}

export async function batchRemovePhotos(formData: FormData): Promise<{ ok: boolean; count: number }> {
  const eventId = formData.get("eventId") as string;
  const photoIds = formData.getAll("photoId") as string[];
  if (!photoIds.length) return { ok: true, count: 0 };
  try { await requireOrganizer(eventId); } catch { return { ok: false, count: 0 }; }

  const result = await prisma.photo.updateMany({
    where: { id: { in: photoIds }, eventId, removedAt: null },
    data: { removedAt: new Date() },
  });
  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true, count: result.count };
}
