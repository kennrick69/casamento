"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function toggleMission(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  const missionId = formData.get("missionId") as string;
  const active = formData.get("active") === "true";

  try { await requireOrganizer(eventId); } catch { return; }

  await prisma.mission.update({
    where: { id: missionId },
    data: { active: !active },
  });
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

  await prisma.checkinCode.update({
    where: { id: codeId },
    data: { active: !active },
  });
  revalidatePath(`/admin/eventos/${eventId}/gincana`);
}
