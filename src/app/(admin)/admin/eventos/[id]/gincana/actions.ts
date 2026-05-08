"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function toggleMission(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const missionId = formData.get("missionId") as string;
  const active = formData.get("active") === "true";

  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.mission.update({ where: { id: missionId }, data: { active: !active } });
  revalidatePath(`/admin/eventos/${eventId}/gincana`);
}

const CustomMissionSchema = z.object({
  eventId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  points: z.coerce.number().int().min(1).max(9999),
  dailyCap: z.coerce.number().int().min(1).optional().or(z.literal("")),
});

export async function createCustomMission(formData: FormData): Promise<void> {
  const parsed = CustomMissionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, title, description, points, dailyCap } = parsed.data;
  try { await requireOrganizer(eventId); } catch { return; }

  const count = await prisma.mission.count({ where: { eventId } });
  const code = `custom_${Date.now()}`;

  await prisma.mission.create({
    data: {
      eventId,
      code,
      title,
      description: description || null,
      points,
      dailyCap: dailyCap ? Number(dailyCap) : null,
      active: true,
      order: count + 1,
    },
  });
  revalidatePath(`/admin/eventos/${eventId}/gincana`);
}

export async function deleteMission(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const missionId = formData.get("missionId") as string;
  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.mission.deleteMany({ where: { id: missionId, eventId } });
  revalidatePath(`/admin/eventos/${eventId}/gincana`);
}

export async function createCheckinCode(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const purpose = (formData.get("purpose") as string)?.trim() || "Check-in";
  const missionId = (formData.get("missionId") as string) || null;

  if (!code) return;
  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.checkinCode.upsert({
    where: { eventId_code: { eventId, code } },
    create: { eventId, code, purpose, missionId, active: true },
    update: { purpose, missionId, active: true },
  });
  revalidatePath(`/admin/eventos/${eventId}/gincana`);
}

export async function toggleCheckinCode(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const codeId = formData.get("codeId") as string;
  const active = formData.get("active") === "true";

  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.checkinCode.update({ where: { id: codeId }, data: { active: !active } });
  revalidatePath(`/admin/eventos/${eventId}/gincana`);
}

export async function deleteCheckinCode(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const codeId = formData.get("codeId") as string;
  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.checkinCode.deleteMany({ where: { id: codeId, eventId } });
  revalidatePath(`/admin/eventos/${eventId}/gincana`);
}
