"use client";

import { useState, useTransition } from "react";
import { addSong } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AddSongForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("slug", slug);
    startTransition(async () => {
      await addSong(fd);
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 rounded-[var(--theme-radius)] border border-[var(--theme-border)] hover:bg-[var(--theme-muted)] transition-colors w-fit"
      >
        + Sugerir música
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[var(--theme-radius)] border border-[var(--theme-border)] p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trackName">Música</Label>
        <Input id="trackName" name="trackName" required placeholder="Perfect" className="h-10" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="artist">Artista</Label>
        <Input id="artist" name="artist" required placeholder="Ed Sheeran" className="h-10" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="externalLink">Link do Spotify (opcional)</Label>
        <Input id="externalLink" name="externalLink" type="url" placeholder="https://open.spotify.com/..." className="h-10" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="h-10 flex-1">
          {isPending ? "Enviando…" : "Sugerir"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
