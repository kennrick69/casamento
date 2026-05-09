"use client";

import { useState, useTransition } from "react";
import { saveDigestFrequency } from "./actions";

const OPTIONS = [
  { value: "NONE", label: "Desativado", description: "Não receber resumos" },
  { value: "DAILY", label: "Diário", description: "Todo dia, com o resumo do dia anterior" },
  { value: "WEEKLY", label: "Semanal", description: "Toda segunda-feira, com o resumo da semana" },
] as const;

interface Props {
  eventId: string;
  current: "NONE" | "DAILY" | "WEEKLY";
}

export function DigestForm({ eventId, current }: Props) {
  const [selected, setSelected] = useState(current);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("frequency", selected);
      void await saveDigestFrequency(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
            selected === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/40"
          }`}
        >
          <input
            type="radio"
            name="frequency"
            value={opt.value}
            checked={selected === opt.value}
            onChange={() => setSelected(opt.value)}
            className="mt-0.5 accent-primary"
          />
          <div>
            <p className="text-sm font-medium">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.description}</p>
          </div>
        </label>
      ))}

      <div className="flex items-center gap-3 mt-1">
        <button
          type="submit"
          disabled={isPending || selected === current}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Salvar preferência"}
        </button>
        {saved && <span className="text-sm text-green-600">Salvo!</span>}
      </div>
    </form>
  );
}
