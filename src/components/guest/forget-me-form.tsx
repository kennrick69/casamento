"use client";

import { useState, useTransition } from "react";
import { forgetMe } from "@/app/(public)/[slug]/esquecam/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ForgetMeForm({
  slug,
  guestEmail,
}: {
  slug: string;
  guestEmail: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirmed) return;
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);

    startTransition(async () => {
      const result = await forgetMe(formData);
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.message);
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Trash2 size={36} className="text-[var(--theme-secondary)]" />
        <p className="font-medium">Solicitação registrada.</p>
        <p className="text-sm text-[var(--theme-secondary)]">
          Seus dados pessoais foram ocultados. A remoção definitiva ocorre em
          até 30 dias conforme a LGPD.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Confirme seu e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={guestEmail ?? ""}
          className="h-12 text-base"
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span className="text-sm text-[var(--theme-secondary)]">
          Entendo que meus dados serão removidos e perderei minha confirmação de
          presença e pontos acumulados.
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-[var(--theme-radius)] px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="outline"
        disabled={isPending || !confirmed}
        className="h-12 w-full text-base border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        {isPending ? "Processando…" : "Remover meus dados"}
      </Button>
    </form>
  );
}
