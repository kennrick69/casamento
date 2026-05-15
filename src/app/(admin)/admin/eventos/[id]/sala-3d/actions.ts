"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import type { Venue3DObjectKind } from "@prisma/client";

function revalidate(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}/sala-3d`);
}

// ── Leitura ─────────────────────────────────────────────────────────────────

export async function getVenue3D(eventId: string) {
  await requireOrganizer(eventId);
  return prisma.venue3D.findUnique({
    where: { eventId },
    include: {
      objects: { orderBy: { createdAt: "asc" } },
      avatars: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getOrCreateVenue3D(eventId: string) {
  await requireOrganizer(eventId);
  return prisma.venue3D.upsert({
    where: { eventId },
    create: { eventId },
    update: {},
    include: {
      objects: { orderBy: { createdAt: "asc" } },
      avatars: { orderBy: { createdAt: "asc" } },
    },
  });
}

// ── Configuração ─────────────────────────────────────────────────────────────

const configSchema = z.object({
  floorWidthTiles: z.number().int().min(6).max(50).optional(),
  floorDepthTiles: z.number().int().min(6).max(50).optional(),
  floorColor:      z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  wallColor:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ambientLight:    z.number().min(0).max(1).optional(),
});

export async function updateVenue3DConfig(eventId: string, data: z.infer<typeof configSchema>) {
  await requireOrganizer(eventId);
  const parsed = configSchema.parse(data);
  await prisma.venue3D.update({ where: { eventId }, data: parsed });
  revalidate(eventId);
  return { ok: true };
}

// ── Objetos ──────────────────────────────────────────────────────────────────

const objectCreateSchema = z.object({
  kind:     z.string() as z.ZodType<Venue3DObjectKind>,
  posX:     z.number().default(0),
  posZ:     z.number().default(0),
  rotation: z.number().default(0),
  label:    z.string().max(80).optional(),
  seats:    z.number().int().min(1).max(50).optional(),
});

export async function createObject(venueId: string, data: z.infer<typeof objectCreateSchema>) {
  const venue = await prisma.venue3D.findUniqueOrThrow({ where: { id: venueId } });
  await requireOrganizer(venue.eventId);
  const parsed = objectCreateSchema.parse(data);
  const obj = await prisma.venue3DObject.create({ data: { venueId, ...parsed } });
  revalidate(venue.eventId);
  return { ok: true, data: obj };
}

const objectUpdateSchema = z.object({
  posX:     z.number().optional(),
  posZ:     z.number().optional(),
  rotation: z.number().optional(),
  label:    z.string().max(80).optional(),
  seats:    z.number().int().min(1).max(50).optional(),
  number:   z.number().int().min(1).optional(),
});

export async function updateObject(objectId: string, data: z.infer<typeof objectUpdateSchema>) {
  const obj = await prisma.venue3DObject.findUniqueOrThrow({
    where: { id: objectId },
    include: { venue: { select: { eventId: true } } },
  });
  await requireOrganizer(obj.venue.eventId);
  const parsed = objectUpdateSchema.parse(data);
  const updated = await prisma.venue3DObject.update({ where: { id: objectId }, data: parsed });
  revalidate(obj.venue.eventId);
  return { ok: true, data: updated };
}

export async function deleteObject(objectId: string) {
  const obj = await prisma.venue3DObject.findUniqueOrThrow({
    where: { id: objectId },
    include: { venue: { select: { eventId: true } } },
  });
  await requireOrganizer(obj.venue.eventId);
  await prisma.venue3DObject.delete({ where: { id: objectId } });
  revalidate(obj.venue.eventId);
  return { ok: true };
}

const bulkUpdateSchema = z.array(z.object({
  id:       z.string(),
  posX:     z.number().optional(),
  posZ:     z.number().optional(),
  rotation: z.number().optional(),
}));

export async function bulkUpdateObjects(venueId: string, updates: z.infer<typeof bulkUpdateSchema>) {
  const venue = await prisma.venue3D.findUniqueOrThrow({ where: { id: venueId } });
  await requireOrganizer(venue.eventId);
  const parsed = bulkUpdateSchema.parse(updates);
  await prisma.$transaction(
    parsed.map((u) => {
      const { id, ...data } = u;
      return prisma.venue3DObject.update({ where: { id, venueId }, data });
    })
  );
  revalidate(venue.eventId);
  return { ok: true };
}
