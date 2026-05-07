"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

const AddSchema = z.object({
  eventId: z.string(),
  time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  order: z.coerce.number().default(0),
});

export async function addJourneyItem(formData: FormData) {
  const parsed = AddSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, ...data } = parsed.data;
  await requireOrganizer(eventId);

  await prisma.journeyItem.create({
    data: {
      eventId,
      time: data.time,
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      order: data.order,
    },
  });

  revalidatePath(`/admin/eventos/${eventId}/roteiro`);
}

export async function deleteJourneyItem(formData: FormData) {
  const itemId = formData.get("itemId") as string;
  const eventId = formData.get("eventId") as string;
  await requireOrganizer(eventId);

  await prisma.journeyItem.delete({ where: { id: itemId } });

  // Re-ordenar os demais
  const remaining = await prisma.journeyItem.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
  });
  for (let i = 0; i < remaining.length; i++) {
    await prisma.journeyItem.update({ where: { id: remaining[i].id }, data: { order: i } });
  }

  revalidatePath(`/admin/eventos/${eventId}/roteiro`);
}

export async function reorderJourneyItems(formData: FormData) {
  const itemId = formData.get("itemId") as string;
  const eventId = formData.get("eventId") as string;
  const direction = formData.get("direction") as "up" | "down";
  await requireOrganizer(eventId);

  const items = await prisma.journeyItem.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
  });

  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return;

  const a = items[idx];
  const b = items[swapIdx];

  await Promise.all([
    prisma.journeyItem.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.journeyItem.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidatePath(`/admin/eventos/${eventId}/roteiro`);
}
