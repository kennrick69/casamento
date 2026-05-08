"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { updateSongStatus, removeSuggestion } from "./actions";
import type { PlaylistSongStatus } from "@prisma/client";

interface Song {
  id: string;
  trackName: string;
  artist: string;
  albumArtUrl: string | null;
  externalLink: string | null;
  spotifyTrackId: string | null;
  songStatus: PlaylistSongStatus;
  voteCount: number;
  guestName: string;
  approved: boolean;
}

const STATUS_LABELS: Record<PlaylistSongStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  PLAYED: "Tocada",
};
const STATUS_OPTIONS: PlaylistSongStatus[] = ["PENDING", "APPROVED", "REJECTED", "PLAYED"];

function SongRow({ song, eventId }: { song: Song; eventId: string }) {
  const [isPending, start] = useTransition();

  function changeStatus(status: PlaylistSongStatus) {
    start(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("suggestionId", song.id);
      fd.set("status", status);
      const result = await updateSongStatus(fd);
      if (!result.ok) toast.error("Falha ao atualizar.");
    });
  }

  function handleRemove() {
    start(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("suggestionId", song.id);
      const result = await removeSuggestion(fd);
      if (!result.ok) toast.error("Falha ao remover.");
    });
  }

  return (
    <div className="border rounded-lg flex items-start gap-3 p-3 bg-background">
      {song.albumArtUrl ? (
        <Image src={song.albumArtUrl} alt={song.trackName} width={44} height={44} className="rounded shrink-0 mt-0.5" unoptimized />
      ) : (
        <div className="w-11 h-11 rounded bg-muted shrink-0 flex items-center justify-center text-lg">🎵</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm">{song.trackName}</p>
          <span className="text-xs text-muted-foreground">▲ {song.voteCount}</span>
        </div>
        <p className="text-xs text-muted-foreground">{song.artist} · por {song.guestName}</p>
        {song.externalLink && (
          <a href={song.externalLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1db954] hover:underline">
            Spotify ↗
          </a>
        )}
        <div className="flex gap-1 mt-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={isPending || song.songStatus === s}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${song.songStatus === s ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/50"}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-xs px-2 py-0.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlaylistAdminClient({ songs, eventId }: { songs: Song[]; eventId: string }) {
  if (songs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Nenhuma sugestão ainda.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {songs.map((song) => <SongRow key={song.id} song={song} eventId={eventId} />)}
    </div>
  );
}
