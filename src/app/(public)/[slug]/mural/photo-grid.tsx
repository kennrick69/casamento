"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

const EMOJIS = ["❤️", "😂", "🥹", "🎉"] as const;

interface Photo {
  id: string;
  storageKey: string;
  caption: string | null;
  guest: { name: string };
  reactionCounts: Record<string, number>;
}

function getOrCreateSessionId(): string {
  const key = "mural_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function ReactionBar({
  photoId,
  initial,
}: {
  photoId: string;
  initial: Record<string, number>;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(initial);
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const toggle = useCallback(
    async (emoji: string) => {
      if (pending) return;
      setPending(true);
      const sessionId = getOrCreateSessionId();
      try {
        const res = await fetch("/api/fotos/reacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId, emoji, sessionId }),
        });
        if (res.ok) {
          const data = (await res.json()) as { counts: Record<string, number>; removed?: boolean };
          setCounts(data.counts);
          setReacted((prev) => {
            const next = new Set(prev);
            if (data.removed) next.delete(emoji);
            else next.add(emoji);
            return next;
          });
        }
      } finally {
        setPending(false);
      }
    },
    [photoId, pending]
  );

  return (
    <div className="flex gap-1 flex-wrap">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = reacted.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={pending}
            className={`text-sm px-1.5 py-0.5 rounded-full border transition-colors ${
              active
                ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10"
                : "border-[var(--theme-border)] bg-[var(--theme-muted)] hover:border-[var(--theme-primary)]/50"
            }`}
          >
            {emoji}
            {count > 0 && <span className="ml-0.5 text-xs opacity-70">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function PhotoModal({
  photos,
  index,
  onClose,
  onNav,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNav: (delta: number) => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNav(-1);
      if (e.key === "ArrowRight") onNav(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNav]);

  // Swipe support
  const startXRef = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startXRef.current;
    if (dx > 50) onNav(-1);
    else if (dx < -50) onNav(1);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none"
        onClick={onClose}
        aria-label="Fechar"
      >
        ✕
      </button>
      {index > 0 && (
        <button
          className="absolute left-3 text-white/70 hover:text-white text-3xl leading-none"
          onClick={(e) => { e.stopPropagation(); onNav(-1); }}
          aria-label="Anterior"
        >
          ‹
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          className="absolute right-3 text-white/70 hover:text-white text-3xl leading-none"
          onClick={(e) => { e.stopPropagation(); onNav(1); }}
          aria-label="Próxima"
        >
          ›
        </button>
      )}

      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-h-[70vh] max-w-[85vw]">
          <Image
            src={`/api/photos/${encodeURIComponent(photo.storageKey)}`}
            alt={photo.caption ?? `Foto de ${photo.guest.name}`}
            width={800}
            height={600}
            className="object-contain max-h-[70vh] rounded-lg"
            unoptimized
          />
        </div>
        <div className="text-center">
          {photo.caption && (
            <p className="text-white text-sm mb-1">{photo.caption}</p>
          )}
          <p className="text-white/50 text-xs">{photo.guest.name}</p>
        </div>
        <ReactionBar photoId={photo.id} initial={photo.reactionCounts} />
      </div>

      <p className="absolute bottom-4 text-white/40 text-xs">
        {index + 1} / {photos.length}
      </p>
    </div>
  );
}

export function PhotoGrid({ photos, slug: _slug }: { photos: Photo[]; slug: string }) {
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const handleNav = useCallback(
    (delta: number) => {
      setModalIndex((i) => {
        if (i === null) return null;
        const next = i + delta;
        return next >= 0 && next < photos.length ? next : i;
      });
    },
    [photos.length]
  );

  const handleClose = useCallback(() => setModalIndex(null), []);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            className="relative aspect-square rounded-[var(--theme-radius)] overflow-hidden bg-[var(--theme-muted)] group focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            onClick={() => setModalIndex(idx)}
            aria-label={`Ver foto de ${photo.guest.name}`}
          >
            <Image
              src={`/api/photos/${encodeURIComponent(photo.storageKey)}`}
              alt={photo.caption ?? `Foto de ${photo.guest.name}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 33vw"
              loading="lazy"
            />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-white text-xs truncate">{photo.caption}</p>
              </div>
            )}
            {Object.keys(photo.reactionCounts).length > 0 && (
              <div className="absolute top-1 right-1 bg-black/60 rounded-full px-1.5 py-0.5 text-[10px] text-white leading-none">
                {Object.values(photo.reactionCounts).reduce((a, b) => a + b, 0)}
              </div>
            )}
          </button>
        ))}
      </div>

      {modalIndex !== null && (
        <PhotoModal
          photos={photos}
          index={modalIndex}
          onClose={handleClose}
          onNav={handleNav}
        />
      )}
    </>
  );
}
