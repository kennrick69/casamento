"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { storyPhotoKeys, type StoryPhoto } from "@/lib/game/story-photos";

export async function addStoryItem(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  await requireOrganizer(eventId);

  const title = (formData.get("title") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const dateLabel = (formData.get("dateLabel") as string | null)?.trim() || null;
  const rawDate = formData.get("date") as string | null;
  const date = rawDate ? new Date(rawDate) : null;

  // Várias fotos com legenda por foto (arrays paralelos "photo" + "caption").
  const files = formData.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  const captions = formData.getAll("caption").map((c) => (typeof c === "string" ? c.trim() : ""));

  const photos: StoryPhoto[] = [];
  for (let i = 0; i < files.length && i < 10; i++) {
    const file = files[i];
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type.includes("png") ? "png" : "jpg";
    const key = `story/${eventId}/${nanoid()}.${ext}`;
    await storage.upload(key, buf, file.type);
    photos.push({ key, caption: captions[i] || null });
  }

  const count = await prisma.coupleStoryItem.count({ where: { eventId } });

  await prisma.coupleStoryItem.create({
    data: {
      eventId,
      title,
      description,
      date,
      dateLabel,
      photoKey: photos[0]?.key ?? null, // legado: 1ª foto (timeline pública)
      photos: photos.length > 0 ? (photos as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      order: count,
    },
  });

  revalidatePath(`/admin/eventos/${eventId}/historia`);
  return { ok: true };
}

export async function deleteStoryItem(itemId: string, eventId: string) {
  await requireOrganizer(eventId);

  const item = await prisma.coupleStoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.eventId !== eventId) return;

  const keys = storyPhotoKeys(item.photos, item.photoKey);

  await Promise.all([
    ...keys.map((k) => storage.delete(k).catch(() => {})),
    prisma.coupleStoryItem.delete({ where: { id: itemId } }),
  ]);

  revalidatePath(`/admin/eventos/${eventId}/historia`);
}
