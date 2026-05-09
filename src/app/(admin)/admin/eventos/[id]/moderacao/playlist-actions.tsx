"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateSongStatus } from "../playlist/actions";

interface Song {
  id: string;
  trackName: string;
  artist: string;
  guest: { name: string };
}

export function PlaylistActions({ song, eventId }: { song: Song; eventId: string }) {
  const [isPending, startTransition] = useTransition();

  function act(status: "APPROVED" | "REJECTED") {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("suggestionId", song.id);
    fd.set("status", status);

    startTransition(async () => {
      const result = await updateSongStatus(fd);
      if (result.ok) {
        toast.success(status === "APPROVED" ? "Música aprovada" : "Música rejeitada");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 border rounded-lg p-3 mb-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{song.trackName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {song.artist} · por {song.guest.name}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={() => act("APPROVED")}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded bg-green-100 text-green-800 hover:bg-green-200 font-medium"
        >
          Aprovar
        </button>
        <button
          onClick={() => act("REJECTED")}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded bg-red-100 text-red-800 hover:bg-red-200 font-medium"
        >
          Rejeitar
        </button>
      </div>
    </div>
  );
}
