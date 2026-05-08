"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

const LOCATION_TYPES = [
  "CEREMONY",
  "RECEPTION",
  "TEA_PARTY",
  "BACHELOR_PARTY",
  "BRUNCH",
  "REHEARSAL",
  "OTHER",
] as const;

const LocationSchema = z.object({
  eventId: z.string(),
  type: z.enum(LOCATION_TYPES),
  title: z.string().min(1),
  address: z.string().optional(),
  date: z.string().optional(),
  timeLabel: z.string().optional(),
  dresscode: z.string().optional(),
  description: z.string().optional(),
  isMain: z.string().optional(),
  isPublic: z.string().optional(),
});

function revalidate(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}/locais`);
}

export async function createLocation(formData: FormData) {
  const parsed = LocationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, isMain, isPublic, date, address, timeLabel, dresscode, description, ...rest } =
    parsed.data;

  await requireOrganizer(eventId);

  const count = await prisma.eventLocation.count({ where: { eventId } });

  await prisma.eventLocation.create({
    data: {
      eventId,
      ...rest,
      address: address || null,
      date: date ? new Date(date) : null,
      timeLabel: timeLabel || null,
      dresscode: dresscode || null,
      description: description || null,
      isMain: isMain === "on",
      isPublic: isPublic !== "off",
      order: count,
    },
  });

  revalidate(eventId);
}

const UpdateSchema = LocationSchema.extend({ locationId: z.string() });

export async function updateLocation(formData: FormData) {
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, locationId, isMain, isPublic, date, address, timeLabel, dresscode, description, ...rest } =
    parsed.data;

  await requireOrganizer(eventId);

  await prisma.eventLocation.update({
    where: { id: locationId, eventId },
    data: {
      ...rest,
      address: address || null,
      date: date ? new Date(date) : null,
      timeLabel: timeLabel || null,
      dresscode: dresscode || null,
      description: description || null,
      isMain: isMain === "on",
      isPublic: isPublic !== "off",
    },
  });

  revalidate(eventId);
}

export async function deleteLocation(formData: FormData) {
  const locationId = formData.get("locationId") as string;
  const eventId = formData.get("eventId") as string;

  await requireOrganizer(eventId);
  await prisma.eventLocation.deleteMany({ where: { id: locationId, eventId } });

  // Renumber orders
  const remaining = await prisma.eventLocation.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
  });
  for (let i = 0; i < remaining.length; i++) {
    await prisma.eventLocation.update({ where: { id: remaining[i]!.id }, data: { order: i } });
  }

  revalidate(eventId);
}

export async function reorderLocations(formData: FormData) {
  const locationId = formData.get("locationId") as string;
  const eventId = formData.get("eventId") as string;
  const direction = formData.get("direction") as "up" | "down";

  await requireOrganizer(eventId);

  const items = await prisma.eventLocation.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
  });

  const idx = items.findIndex((i) => i.id === locationId);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return;

  const a = items[idx]!;
  const b = items[swapIdx]!;

  await Promise.all([
    prisma.eventLocation.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.eventLocation.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidate(eventId);
}
