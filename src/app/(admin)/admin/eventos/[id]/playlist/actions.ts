"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import type { PlaylistSongStatus } from "@prisma/client";

const VALID_STATUSES: PlaylistSongStatus[] = ["PENDING", "APPROVED", "REJECTED", "PLAYED"];

export async function updateSongStatus(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const suggestionId = formData.get("suggestionId") as string;
  const status = formData.get("status") as PlaylistSongStatus;
  if (!VALID_STATUSES.includes(status)) return { ok: false };
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.playlistSuggestion.updateMany({
    where: { id: suggestionId, eventId },
    data: { songStatus: status },
  });
  revalidatePath(`/admin/eventos/${eventId}/playlist`);
  return { ok: true };
}

export async function removeSuggestion(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const suggestionId = formData.get("suggestionId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.playlistSuggestion.deleteMany({ where: { id: suggestionId, eventId } });
  revalidatePath(`/admin/eventos/${eventId}/playlist`);
  return { ok: true };
}
