"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { revalidatePath } from "next/cache";

const SongSchema = z.object({
  slug: z.string(),
  trackName: z.string().min(1).max(100),
  artist: z.string().min(1).max(100),
  externalLink: z.string().url().optional().or(z.literal("")),
});

export async function addSong(formData: FormData) {
  const parsed = SongSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { slug, trackName, artist, externalLink } = parsed.data;

  const guest = await getCurrentGuest(slug);
  if (!guest || guest.banned) return;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, features: true },
  });
  if (!event) return;

  const features = event.features as Record<string, boolean>;
  if (!features.playlist) return;

  await prisma.playlistSuggestion.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      trackName: trackName.trim(),
      artist: artist.trim(),
      externalLink: externalLink || null,
    },
  });

  revalidatePath(`/${slug}/playlist`);
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
    await prisma.playlistVote.create({
      data: { suggestionId, guestId: guest.id },
    });
  }

  revalidatePath(`/${slug}/playlist`);
}
