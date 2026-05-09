"use client";

import { useState, useEffect, useRef } from "react";
import { Radio } from "lucide-react";

const TYPE_EMOJI: Record<string, string> = {
  ceremony: "💒",
  toast: "🥂",
  music: "🎵",
  photo: "📸",
  update: "✨",
  custom: "📢",
};

interface LiveEventItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
}

interface Props {
  eventId: string;
  initialEvents: LiveEventItem[];
  pusherKey: string;
  pusherCluster: string;
  coupleNames: string;
}

export function AoVivoClient({ eventId, initialEvents, pusherKey, pusherCluster, coupleNames }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [isLive, setIsLive] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pusherKey || !pusherCluster) return;
    type PI = import("pusher-js").default;
    type PC = ReturnType<PI["subscribe"]>;
    let pusher: PI | null = null;
    let channel: PC | null = null;

    import("pusher-js").then(({ default: Pusher }) => {
      pusher = new Pusher(pusherKey, { cluster: pusherCluster });
      channel = pusher.subscribe(`event-${eventId}`);
      setIsLive(true);

      channel.bind("live-update", (ev: LiveEventItem) => {
        setEvents((prev) => {
          if (prev.some((e) => e.id === ev.id)) return prev;
          return [ev, ...prev];
        });
        topRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    });

    return () => {
      channel?.unbind_all();
      pusher?.disconnect();
      setIsLive(false);
    };
  }, [eventId, pusherKey, pusherCluster]);

  const latest = events[0];

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-2" ref={topRef}>
        <span className={`h-2 w-2 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {isLive ? "Ao vivo" : "Conectando…"}
        </span>
      </div>

      <h1
        className="text-2xl font-semibold mb-1"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        {coupleNames}
      </h1>
      <p className="text-sm text-[var(--theme-secondary)] mb-6">
        Acompanhe os momentos em tempo real
      </p>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Radio size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Ainda não há atualizações. Fique de olho!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((ev, i) => (
            <div
              key={ev.id}
              className={`rounded-xl border px-4 py-4 transition-all ${
                i === 0
                  ? "border-[var(--theme-primary)] bg-[var(--theme-muted)]"
                  : "border-[var(--theme-border)] bg-[var(--theme-background)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{TYPE_EMOJI[ev.type] ?? "✨"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base leading-snug">{ev.title}</p>
                  {ev.body && <p className="text-sm text-[var(--theme-secondary)] mt-0.5">{ev.body}</p>}
                  <p className="text-xs text-[var(--theme-secondary)] mt-2 tabular-nums">
                    {new Date(ev.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {i === 0 && (
                  <span className="shrink-0 rounded-full bg-[var(--theme-primary)] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                    Agora
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
