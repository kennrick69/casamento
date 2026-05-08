"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { isHttpUrl } from "@/lib/utils/safe-href";
import { revalidatePath } from "next/cache";
import { awardPoints } from "@/lib/points";

const SONG_LIMIT = 3;

const SongSchema = z.object({
  slug: z.string(),
  trackName: z.string().min(1).max(100),
  artist: z.string().min(1).max(100),
  externalLink: z.string().url().refine((u) => isHttpUrl(u), "URL deve começar com https://").optional().or(z.literal("")),
  spotifyTrackId: z.string().optional(),
  previewUrl: z.string().url().optional().or(z.literal("")),
  albumArtUrl: z.string().url().optional().or(z.literal("")),
});

export async function addSong(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const parsed = SongSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { slug, trackName, artist, externalLink, spotifyTrackId, previewUrl, albumArtUrl } = parsed.data;

  const guest = await getCurrentGuest(slug);
  if (!guest || guest.banned) return { ok: false, error: "Acesso negado." };

  const rl = await checkRateLimit(`playlist:${guest.id}`, guest.id, 10, 60);
  if (!rl.allowed) return { ok: false, error: "Muitas sugestões. Aguarde." };

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, features: true },
  });
  if (!event) return { ok: false, error: "Evento não encontrado." };

  const features = event.features as Record<string, boolean>;
  if (!features.playlist) return { ok: false, error: "Playlist desativada." };

  const myCount = await prisma.playlistSuggestion.count({
    where: { eventId: event.id, guestId: guest.id },
  });
  if (myCount >= SONG_LIMIT) {
    return { ok: false, error: `Você já sugeriu ${SONG_LIMIT} músicas (limite atingido).` };
  }

  await prisma.playlistSuggestion.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      trackName: trackName.trim(),
      artist: artist.trim(),
      externalLink: externalLink || null,
      spotifyTrackId: spotifyTrackId || null,
      previewUrl: previewUrl || null,
      albumArtUrl: albumArtUrl || null,
    },
  });

  void awardPoints(guest.id, event.id, "playlist_add");
  revalidatePath(`/${slug}/playlist`);
  return { ok: true };
}

export async function toggleVote(formData: FormData) {
  const slug = formData.get("slug") as string;
  const suggestionId = formData.get("suggestionId") as string;

  const guest = await getCurrentGuest(slug);
  if (!guest || guest.banned) return;

  const existing = await prisma.playlistVote.findUnique({
    where: { suggestionId_guestId: { suggestionId, guestId: guest.id } },
  });

  if (existing) {
    await prisma.playlistVote.delete({
      where: { suggestionId_guestId: { suggestionId, guestId: guest.id } },
    });
  } else {
    const suggestion = await prisma.playlistSuggestion.findUnique({
      where: { id: suggestionId },
      select: { eventId: true },
    });
    await prisma.playlistVote.create({
      data: { suggestionId, guestId: guest.id },
    });
    if (suggestion) void awardPoints(guest.id, suggestion.eventId, "vote_cast");
  }

  revalidatePath(`/${slug}/playlist`);
}
