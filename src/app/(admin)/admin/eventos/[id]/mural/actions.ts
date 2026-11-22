"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { storage } from "@/lib/storage";
import { deletePhotoFile } from "@/lib/storage/photo-file";
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

  // Pega a key ANTES do soft-delete para apagar o byte no volume.
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId },
    select: { storageKey: true },
  });
  await prisma.photo.updateMany({ where: { id: photoId, eventId }, data: { removedAt: new Date() } });
  await deletePhotoFile(photo?.storageKey);

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

  // Keys das fotos que ainda não foram removidas, antes do soft-delete.
  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, eventId, removedAt: null },
    select: { storageKey: true },
  });
  const result = await prisma.photo.updateMany({
    where: { id: { in: photoIds }, eventId, removedAt: null },
    data: { removedAt: new Date() },
  });
  await Promise.all(photos.map((p) => deletePhotoFile(p.storageKey)));

  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true, count: result.count };
}

/**
 * Limpa arquivos órfãos do volume: bytes em `${slug}/fotos/` que não têm mais
 * uma foto VIVA (removedAt null) no banco. Cobre:
 *  - fotos removidas antes deste fix (soft-delete deixava o arquivo), e
 *  - arquivos de teste cuja linha foi apagada direto no banco.
 *
 * Seguro por construção: o prefixo `${slug}/fotos/` é exclusivo do mural
 * (galeria usa `gallery/...`, história usa `story/...`), então basta checar
 * a tabela Photo. Disparado pelo organizador logado — sem Railway SSH.
 */
export async function purgeOrphanMuralFiles(
  formData: FormData,
): Promise<{ ok: boolean; deleted: number; keys: string[] }> {
  const eventId = formData.get("eventId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false, deleted: 0, keys: [] }; }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
  if (!event) return { ok: false, deleted: 0, keys: [] };

  const prefix = `${event.slug}/fotos/`;
  const files = await storage.list(prefix);
  if (files.length === 0) return { ok: true, deleted: 0, keys: [] };

  const live = await prisma.photo.findMany({
    where: { eventId, removedAt: null },
    select: { storageKey: true },
  });
  const liveKeys = new Set(live.map((p) => p.storageKey));

  const orphans = files.filter((key) => !liveKeys.has(key));
  await Promise.all(orphans.map((key) => deletePhotoFile(key)));

  revalidatePath(`/admin/eventos/${eventId}/mural`);
  return { ok: true, deleted: orphans.length, keys: orphans };
}
