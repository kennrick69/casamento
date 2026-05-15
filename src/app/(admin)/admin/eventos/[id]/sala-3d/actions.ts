"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

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

export async function updateVenue3DSettings(
  eventId: string,
  data: {
    floorWidthTiles?: number;
    floorDepthTiles?: number;
    floorColor?: string;
    wallColor?: string;
    ambientLight?: number;
  }
) {
  await requireOrganizer(eventId);
  await prisma.venue3D.update({ where: { eventId }, data });
  revalidatePath(`/admin/eventos/${eventId}/sala-3d`);
  return { ok: true };
}
