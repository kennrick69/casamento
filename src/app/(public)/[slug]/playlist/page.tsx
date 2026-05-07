import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { AddSongForm } from "./add-song-form";
import { VoteButton } from "./vote-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Playlist" };

export default async function PlaylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;

  const result = await validateEventAccess(slug, k ?? null);
  if (!result.ok) notFound();

  const { event, guest } = result;

  const features = event.features as Record<string, boolean>;
  if (features.playlist === false) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <p className="text-[var(--theme-secondary)] text-sm mt-8">Playlist não disponível.</p>
      </div>
    );
  }

  const suggestions = await prisma.playlistSuggestion.findMany({
    where: { eventId: event.id, approved: true },
    orderBy: { createdAt: "desc" },
    include: {
      votes: true,
      guest: { select: { name: true } },
    },
  });

  const sorted = suggestions.sort((a, b) => b.votes.length - a.votes.length);
  const myVotes = new Set(
    guest
      ? sorted
          .filter((s) => s.votes.some((v) => v.guestId === guest.id))
          .map((s) => s.id)
      : []
  );

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <div>
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          Playlist colaborativa
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          Sugira uma música e vote nas favoritas!
        </p>
      </div>

      {guest ? (
        <AddSongForm slug={slug} />
      ) : (
        <p className="text-sm text-[var(--theme-secondary)]">
          <a href={`/${slug}/rsvp`} className="underline font-medium">
            Confirme sua presença
          </a>{" "}
          para sugerir músicas.
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--theme-secondary)] text-center py-6">
          Nenhuma sugestão ainda. Seja o primeiro!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-[var(--theme-radius)] border border-[var(--theme-border)] px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.trackName}</p>
                <p className="text-sm text-[var(--theme-secondary)] truncate">{s.artist}</p>
                {s.externalLink && (
                  <a
                    href={s.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--theme-primary)] hover:underline"
                  >
                    Ouvir ↗
                  </a>
                )}
              </div>
              <VoteButton
                suggestionId={s.id}
                slug={slug}
                votes={s.votes.length}
                voted={myVotes.has(s.id)}
                disabled={!guest}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
