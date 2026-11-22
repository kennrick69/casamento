"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { deletePhotoFile } from "@/lib/storage/photo-file";
import { revalidatePath } from "next/cache";

export async function resolveReport(formData: FormData): Promise<{ ok: boolean; action?: string }> {
  const eventId = formData.get("eventId") as string;
  const reportId = formData.get("reportId") as string;
  const action = formData.get("action") as "DISMISSED" | "REMOVED";
  const photoId = formData.get("photoId") as string | null;
  const chatMessageId = formData.get("chatMessageId") as string | null;

  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: action, resolvedAt: new Date() },
  });

  if (action === "REMOVED") {
    if (photoId) {
      // Pega a key antes do soft-delete para apagar o byte no volume.
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { storageKey: true },
      });
      await prisma.photo.update({ where: { id: photoId }, data: { removedAt: new Date() } });
      await deletePhotoFile(photo?.storageKey);
    }
    if (chatMessageId) {
      await prisma.chatMessage.update({ where: { id: chatMessageId }, data: { removedAt: new Date() } });
    }
  }

  revalidatePath(`/admin/eventos/${eventId}/moderacao`);
  return { ok: true, action };
}
