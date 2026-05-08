"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { addSong } from "./actions";
import Image from "next/image";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;
  albumArt: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
}

interface SearchResult {
  tracks: SpotifyTrack[];
  configured: boolean;
}

export function AddSongForm({ slug, myCount, limit }: { slug: string; myCount: number; limit: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [spotifyAvailable, setSpotifyAvailable] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<SpotifyTrack | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limitReached = myCount >= limit;

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { previewAudio?.pause(); };
  }, [previewAudio]);

  // Debounced Spotify search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as SearchResult;
      setSpotifyAvailable(data.configured);
      setResults(data.tracks);
    }, 400);
  }, [query]);

  function togglePreview(track: SpotifyTrack) {
    if (!track.previewUrl) return;
    if (playingId === track.id) {
      previewAudio?.pause();
      setPlayingId(null);
      return;
    }
    previewAudio?.pause();
    const audio = new Audio(track.previewUrl);
    audio.play().catch(() => null);
    audio.onended = () => setPlayingId(null);
    setPreviewAudio(audio);
    setPlayingId(track.id);
  }

  function selectTrack(track: SpotifyTrack) {
    previewAudio?.pause();
    setPlayingId(null);
    setSelected(track);
    setResults([]);
    setQuery(track.name);
  }

  function cancel() {
    previewAudio?.pause();
    setPlayingId(null);
    setOpen(false);
    setSelected(null);
    setQuery("");
    setResults([]);
    setError(null);
    setManualMode(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("slug", slug);
    if (selected) {
      fd.set("spotifyTrackId", selected.id);
      fd.set("trackName", selected.name);
      fd.set("artist", selected.artists);
      fd.set("externalLink", selected.spotifyUrl);
      if (selected.previewUrl) fd.set("previewUrl", selected.previewUrl);
      if (selected.albumArt) fd.set("albumArtUrl", selected.albumArt);
    }
    startTransition(async () => {
      const result = await addSong(fd);
      if (!result.ok) {
        setError(result.error ?? "Erro ao sugerir.");
        return;
      }
      cancel();
    });
  }

  if (limitReached) {
    return (
      <p className="text-sm text-[var(--theme-secondary)]">
        Você já sugeriu {limit} músicas (limite atingido).
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 rounded-[var(--theme-radius)] border border-[var(--theme-border)] hover:bg-[var(--theme-muted)] transition-colors w-fit"
      >
        + Sugerir música ({limit - myCount} restante{limit - myCount !== 1 ? "s" : ""})
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[var(--theme-radius)] border border-[var(--theme-border)] p-4">

      {/* Spotify search or manual mode */}
      {!manualMode ? (
        <div className="relative">
          <label className="text-sm font-medium mb-1 block">Buscar música</label>
          {selected ? (
            <div className="flex items-center gap-3 border border-[var(--theme-border)] rounded-[var(--theme-radius)] p-2 bg-[var(--theme-muted)]">
              {selected.albumArt && (
                <Image src={selected.albumArt} alt={selected.name} width={40} height={40} className="rounded shrink-0"/>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{selected.name}</p>
                <p className="text-xs text-[var(--theme-secondary)] truncate">{selected.artists}</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setQuery(""); }} className="text-xs text-[var(--theme-secondary)] shrink-0">✕</button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome da música ou artista…"
                className="w-full rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
              />
              {results.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border border-[var(--theme-border)] rounded-[var(--theme-radius)] shadow-lg overflow-hidden">
                  {results.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--theme-muted)] cursor-pointer"
                      onClick={() => selectTrack(track)}
                    >
                      {track.albumArt && (
                        <Image src={track.albumArt} alt={track.name} width={36} height={36} className="rounded shrink-0"/>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{track.name}</p>
                        <p className="text-xs text-[var(--theme-secondary)] truncate">{track.artists}</p>
                      </div>
                      {track.previewUrl && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); togglePreview(track); }}
                          className="shrink-0 text-lg leading-none"
                          aria-label={playingId === track.id ? "Pausar" : "Ouvir prévia"}
                        >
                          {playingId === track.id ? "⏸" : "▶"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {spotifyAvailable === false && (
            <p className="text-xs text-[var(--theme-secondary)] mt-1">
              Busca Spotify não configurada.{" "}
              <button type="button" className="underline" onClick={() => setManualMode(true)}>
                Inserir manualmente
              </button>
            </p>
          )}
          {!selected && (
            <p className="text-xs text-[var(--theme-secondary)] mt-1">
              Ou{" "}
              <button type="button" className="underline" onClick={() => setManualMode(true)}>
                inserir manualmente
              </button>
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Música</label>
            <input name="trackName" required placeholder="Perfect" className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Artista</label>
            <input name="artist" required placeholder="Ed Sheeran" className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Link (opcional)</label>
            <input name="externalLink" type="url" placeholder="https://open.spotify.com/…" className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--theme-primary)]" />
          </div>
          <button type="button" className="text-xs text-[var(--theme-secondary)] underline text-left" onClick={() => setManualMode(false)}>
            ← Voltar para busca Spotify
          </button>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || (!selected && !manualMode)}
          className="flex-1 text-sm py-2 rounded-[var(--theme-radius)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Enviando…" : "Sugerir"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="text-sm py-2 px-4 rounded-[var(--theme-radius)] border border-[var(--theme-border)] hover:bg-[var(--theme-muted)] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
