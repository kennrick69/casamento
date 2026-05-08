import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { AddSongForm } from "./add-song-form";
import { VoteButton } from "./vote-button";
import { safeHref } from "@/lib/utils/safe-href";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Playlist" };

const SONG_LIMIT = 3;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  PLAYED: "Tocada",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-600",
  PLAYED: "bg-blue-100 text-blue-800",
};

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
      ? sorted.filter((s) => s.votes.some((v) => v.guestId === guest.id)).map((s) => s.id)
      : []
  );
  const myCount = guest ? suggestions.filter((s) => s.guestId === guest.id).length : 0;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: "var(--theme-font-heading)" }}>
          Playlist colaborativa
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          Sugira até {SONG_LIMIT} músicas e vote nas favoritas!
        </p>
      </div>

      {guest ? (
        <AddSongForm slug={slug} myCount={myCount} limit={SONG_LIMIT} />
      ) : (
        <p className="text-sm text-[var(--theme-secondary)]">
          <a href={`/${slug}/rsvp`} className="underline font-medium">Confirme sua presença</a>{" "}
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
              className="flex items-center gap-3 rounded-[var(--theme-radius)] border border-[var(--theme-border)] px-3 py-3"
            >
              {s.albumArtUrl ? (
                <Image src={s.albumArtUrl} alt={s.trackName} width={44} height={44} className="rounded shrink-0"/>
              ) : (
                <div className="w-11 h-11 rounded bg-[var(--theme-muted)] shrink-0 flex items-center justify-center text-xl">
                  🎵
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-medium truncate text-sm">{s.trackName}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full leading-none ${STATUS_COLORS[s.songStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[s.songStatus] ?? s.songStatus}
                  </span>
                </div>
                <p className="text-xs text-[var(--theme-secondary)] truncate">{s.artist}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-[var(--theme-secondary)]">por {s.guest.name}</p>
                  {s.externalLink && (
                    <a
                      href={safeHref(s.externalLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[var(--theme-primary)] hover:underline"
                    >
                      Ouvir ↗
                    </a>
                  )}
                </div>
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
