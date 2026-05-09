import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { PlaylistAdminClient } from "./playlist-admin-client";

interface Props { params: Promise<{ id: string }> }

export default async function AdminPlaylistPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const suggestions = await prisma.playlistSuggestion.findMany({
    where: { eventId },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    include: {
      guest: { select: { name: true } },
      votes: { select: { guestId: true } },
    },
  });

  const spotifyLinks = suggestions
    .filter((s) => s.externalLink?.includes("spotify.com"))
    .map((s) => s.externalLink!)
    .slice(0, 100);

  const serialized = suggestions.map((s) => ({
    id: s.id,
    trackName: s.trackName,
    artist: s.artist,
    albumArtUrl: s.albumArtUrl,
    externalLink: s.externalLink,
    spotifyTrackId: s.spotifyTrackId,
    songStatus: s.songStatus,
    voteCount: s.votes.length,
    guestName: s.guest.name,
    approved: s.approved,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Playlist" eventId={eventId} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Playlist</h1>
          <p className="text-sm text-muted-foreground">{suggestions.length} sugestões</p>
        </div>

        {spotifyLinks.length > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3 flex items-center justify-between">
            <p className="text-sm">{spotifyLinks.length} músicas com link Spotify</p>
            <a
              href={`https://open.spotify.com/search/${encodeURIComponent(suggestions.filter(s => s.spotifyTrackId).map(s => s.trackName).slice(0,3).join(" "))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#1db954] hover:underline font-medium"
            >
              Abrir Spotify ↗
            </a>
          </div>
        )}

        <PlaylistAdminClient songs={serialized} eventId={eventId} />
      </main>
    </div>
  );
}
