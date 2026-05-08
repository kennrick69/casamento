"use client";

import { useState, useTransition } from "react";
import { doCheckin } from "./actions";

export function CheckinForm({ slug, initialCode }: { slug: string; initialCode?: string }) {
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [result, setResult] = useState<{ ok: boolean; message: string; points?: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("code", code);
      const res = await doCheckin(fd);
      setResult(res);
      if (res.ok) setCode("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-sm font-medium">
          Código do local
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex.: CASAMENTO2026"
          maxLength={20}
          autoComplete="off"
          autoCapitalize="characters"
          disabled={isPending}
          className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3 text-base tracking-widest font-mono outline-none focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !code.trim()}
        className="py-3 rounded-[var(--theme-radius)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] font-medium disabled:opacity-40 transition-opacity"
      >
        {isPending ? "Verificando…" : "Já cheguei!"}
      </button>

      {result && (
        <div
          className={`rounded-[var(--theme-radius)] px-4 py-3 text-sm text-center ${
            result.ok
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {result.message}
          {result.ok && result.points && result.points > 0 && (
            <p className="mt-1 font-bold">+{result.points} pontos!</p>
          )}
        </div>
      )}
    </form>
  );
}
