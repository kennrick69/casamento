"use client";

import { useState, useTransition } from "react";
import { sendMassEmail } from "./actions";

export function MassEmailForm({ eventId, confirmedCount, totalCount }: {
  eventId: string;
  confirmedCount: number;
  totalCount: number;
}) {
  const [result, setResult] = useState<{ ok: boolean; sent?: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await sendMassEmail(fd);
      setResult(res);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Destinatários</label>
        <select
          name="audience"
          className="border rounded px-3 py-2 text-sm bg-background"
        >
          <option value="confirmed">Confirmados ({confirmedCount})</option>
          <option value="all">Todos com email ({totalCount})</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Assunto</label>
        <input
          name="subject"
          required
          maxLength={120}
          placeholder="Novidade sobre o nosso casamento!"
          className="border rounded px-3 py-2 text-sm bg-background"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Mensagem</label>
        <textarea
          name="body"
          required
          rows={6}
          maxLength={2000}
          placeholder="Escreva sua mensagem aqui…"
          className="border rounded px-3 py-2 text-sm bg-background resize-y"
        />
        <p className="text-xs text-muted-foreground">Cada parágrafo vazio vira uma linha em branco no email.</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="self-start px-6 py-2 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Enviando…" : "Enviar email"}
      </button>

      {result && (
        <div className={`rounded px-4 py-3 text-sm border ${result.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {result.ok ? `Emails enviados para ${result.sent} convidado${result.sent !== 1 ? "s" : ""}.` : result.error}
        </div>
      )}
    </form>
  );
}
