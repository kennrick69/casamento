"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { nanoid } from "nanoid";

export async function addStoryItem(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  await requireOrganizer(eventId);

  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const dateLabel = (formData.get("dateLabel") as string | null)?.trim() || null;
  const rawDate = formData.get("date") as string | null;
  const date = rawDate ? new Date(rawDate) : null;

  const file = formData.get("photo") as File | null;
  let photoKey: string | null = null;

  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type.includes("png") ? "png" : "jpg";
    photoKey = `story/${eventId}/${nanoid()}.${ext}`;
    await storage.upload(photoKey, buf, file.type);
  }

  const count = await prisma.coupleStoryItem.count({ where: { eventId } });

  await prisma.coupleStoryItem.create({
    data: { eventId, title, description, date, dateLabel, photoKey, order: count },
  });

  revalidatePath(`/admin/eventos/${eventId}/historia`);
  return { ok: true };
}

export async function deleteStoryItem(itemId: string, eventId: string) {
  await requireOrganizer(eventId);

  const item = await prisma.coupleStoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.eventId !== eventId) return;

  await Promise.all([
    item.photoKey ? storage.delete(item.photoKey).catch(() => {}) : Promise.resolve(),
    prisma.coupleStoryItem.delete({ where: { id: itemId } }),
  ]);

  revalidatePath(`/admin/eventos/${eventId}/historia`);
}
