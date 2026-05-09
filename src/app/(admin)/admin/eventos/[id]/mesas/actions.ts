"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

async function revalidate(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}/mesas`);
}

export async function createTable(eventId: string, name: string, capacity: number) {
  await requireOrganizer(eventId);
  const count = await prisma.seatingTable.count({ where: { eventId } });
  await prisma.seatingTable.create({ data: { eventId, name, capacity, order: count } });
  await revalidate(eventId);
  return { ok: true };
}

export async function deleteTable(eventId: string, tableId: string) {
  await requireOrganizer(eventId);
  await prisma.seatingTable.delete({ where: { id: tableId, eventId } });
  await revalidate(eventId);
  return { ok: true };
}

export async function assignGuest(eventId: string, tableId: string, guestId: string) {
  await requireOrganizer(eventId);
  await prisma.seatingAssignment.upsert({
    where: { guestId },
    create: { tableId, guestId },
    update: { tableId },
  });
  await revalidate(eventId);
  return { ok: true };
}

export async function unassignGuest(eventId: string, guestId: string) {
  await requireOrganizer(eventId);
  await prisma.seatingAssignment.deleteMany({ where: { guestId } });
  await revalidate(eventId);
  return { ok: true };
}

export async function updateTableName(eventId: string, tableId: string, name: string, capacity: number) {
  await requireOrganizer(eventId);
  await prisma.seatingTable.update({ where: { id: tableId, eventId }, data: { name, capacity } });
  await revalidate(eventId);
  return { ok: true };
}
