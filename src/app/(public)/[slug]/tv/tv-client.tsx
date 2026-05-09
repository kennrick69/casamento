"use client";

import { useState, useEffect, useCallback } from "react";
import type { Slide } from "./page";

const SLIDE_DURATION_MS = 8000;

interface LatestLive {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: Date;
}

interface Props {
  eventId: string;
  coupleNames: string;
  slides: Slide[];
  latestLive: LatestLive | null;
}

export function TvClient({ coupleNames, slides: initialSlides, latestLive }: Props) {
  const [slides] = useState(initialSlides);
  const [current, setCurrent] = useState(0);
  const [live, setLive] = useState<LatestLive | null>(latestLive);
  const [showLiveBanner, setShowLiveBanner] = useState(!!latestLive);

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    if (slides.length === 0) return;
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, SLIDE_DURATION_MS);
    return () => clearInterval(t);
  }, [next, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Pusher live updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!pusherKey || !pusherCluster) return;

    let channel: { unbind_all: () => void; unsubscribe: () => void } | null = null;

    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
      // eventId not directly in scope but we get it via event slug from URL
      // We'll listen for updates pushed from the live admin panel
      channel = pusher.subscribe(`event-${window.location.pathname.split("/")[1]}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (channel as any).bind("live-update", (data: LatestLive) => {
        setLive(data);
        setShowLiveBanner(true);
      });
    }).catch(() => null);

    return () => {
      channel?.unbind_all();
      channel?.unsubscribe();
    };
  }, []);

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-4xl font-light mb-4">{coupleNames}</p>
          <p className="text-lg text-white/60">O slideshow aparecerá quando houver fotos e mensagens.</p>
        </div>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* Main slide */}
      <div className="absolute inset-0">
        {slide.type === "photo" && <PhotoSlide slide={slide} />}
        {slide.type === "message" && <MessageSlide slide={slide} coupleNames={coupleNames} />}
        {slide.type === "schedule" && <ScheduleSlide slide={slide} coupleNames={coupleNames} />}
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full bg-white rounded-full transition-all ${i === current ? "animate-progress-bar" : i < current ? "w-full" : "w-0"}`}
              style={i === current ? { animationDuration: `${SLIDE_DURATION_MS}ms` } : {}}
            />
          </div>
        ))}
      </div>

      {/* Couple name watermark */}
      <div className="absolute bottom-6 left-6 z-10">
        <p className="text-white/50 text-sm font-light tracking-widest uppercase">{coupleNames}</p>
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-6 right-6 z-10">
        <p className="text-white/40 text-xs">{current + 1}/{slides.length}</p>
      </div>

      {/* Navigation tap zones */}
      <button
        className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-w-resize"
        onClick={prev}
        aria-label="Slide anterior"
      />
      <button
        className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-e-resize"
        onClick={next}
        aria-label="Próximo slide"
      />

      {/* Live event banner */}
      {showLiveBanner && live && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 max-w-sm w-[90%] text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Agora</span>
          </div>
          <p className="font-semibold text-base">{live.title}</p>
          {live.body && <p className="text-sm text-white/70 mt-1">{live.body}</p>}
          <button
            className="mt-3 text-xs text-white/40 underline"
            onClick={() => setShowLiveBanner(false)}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Slide renderers ────────────────────────────────────────────────────────

function PhotoSlide({ slide }: { slide: Slide }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.photoUrl}
        alt={slide.caption ?? ""}
        className="max-h-full max-w-full object-contain"
      />
      {slide.caption && (
        <div className="absolute bottom-16 left-0 right-0 text-center px-8">
          <p className="text-white/80 text-base italic bg-black/40 rounded-xl px-4 py-2 inline-block">
            {slide.caption}
          </p>
        </div>
      )}
    </div>
  );
}

function MessageSlide({ slide, coupleNames }: { slide: Slide; coupleNames: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-950 via-black to-pink-950 px-10">
      <p className="text-white/30 text-5xl mb-6 font-serif">"</p>
      <p className="text-white text-2xl md:text-3xl font-light text-center leading-relaxed max-w-2xl">
        {slide.content}
      </p>
      <p className="mt-8 text-white/50 text-sm">— {slide.author}</p>
      <p className="mt-12 text-white/20 text-xs uppercase tracking-widest">{coupleNames}</p>
    </div>
  );
}

function ScheduleSlide({ slide, coupleNames }: { slide: Slide; coupleNames: string }) {
  const items = slide.scheduleItems ?? [];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-black to-slate-900 px-10">
      <p className="text-white/50 text-xs uppercase tracking-widest mb-8">{coupleNames} · Programação</p>
      <div className="flex flex-col gap-5 max-w-md w-full">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-4">
            {item.time && (
              <span className="text-white/40 text-sm font-mono w-12 shrink-0 mt-0.5">{item.time}</span>
            )}
            <span className="text-white text-lg font-light">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
