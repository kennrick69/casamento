"use client";

import { useState, useTransition } from "react";
import { Radio, Trash2 } from "lucide-react";

const QUICK_EVENTS = [
  { type: "ceremony", title: "Cerimônia começou", emoji: "💒" },
  { type: "toast", title: "Primeiro brinde", emoji: "🥂" },
  { type: "music", title: "Música dos noivos", emoji: "🎵" },
  { type: "photo", title: "Foto do casal", emoji: "📸" },
  { type: "update", title: "Corte do bolo", emoji: "🎂" },
];

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
}

export function LiveAdminClient({ eventId, initialEvents }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("update");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function post(payload: { type: string; title: string; body?: string }) {
    const res = await fetch(`/api/admin/eventos/${eventId}/live`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { setError("Erro ao publicar."); return; }
    const data = await res.json();
    setEvents((prev) => [data.event, ...prev]);
    setTitle("");
    setBody("");
    setError(null);
  }

  function handleQuick(ev: { type: string; title: string }) {
    startTransition(() => post(ev));
  }

  function handleCustom() {
    if (!title.trim()) return;
    startTransition(() => post({ type, title: title.trim(), body: body.trim() || undefined }));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/eventos/${eventId}/live?id=${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {/* Quick actions */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Publicar rápido
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_EVENTS.map((ev) => (
            <button
              key={ev.title}
              onClick={() => handleQuick(ev)}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <span>{ev.emoji}</span>
              {ev.title}
            </button>
          ))}
        </div>
      </section>

      {/* Custom event */}
      <section className="bg-background rounded-lg border border-border p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Mensagem personalizada
        </h2>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Título (ex: Surpresa especial!)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            maxLength={100}
          />
          <textarea
            placeholder="Detalhe (opcional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            maxLength={500}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleCustom}
            disabled={isPending || !title.trim()}
            className="self-start flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Radio size={14} />
            Publicar ao vivo
          </button>
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Timeline ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento publicado ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 bg-background rounded-lg border border-border px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{ev.title}</p>
                  {ev.body && <p className="text-xs text-muted-foreground mt-0.5">{ev.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(ev.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
