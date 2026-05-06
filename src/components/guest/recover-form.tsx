"use client";

import { useState, useTransition } from "react";
import { requestRecoveryLink } from "@/app/(public)/[slug]/recuperar/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function RecoverForm({ slug }: { slug: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);

    startTransition(async () => {
      const result = await requestRecoveryLink(formData);
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.message);
      }
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Mail size={36} className="text-[var(--theme-accent)]" />
        <p className="font-medium">Link enviado!</p>
        <p className="text-sm text-[var(--theme-secondary)]">
          Se esse e-mail estiver na nossa lista, você receberá um link de acesso em instantes.
        </p>
        <p className="text-xs text-[var(--theme-secondary)]">
          Não chegou? Verifique o spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="emailAddr">Seu e-mail</Label>
        <Input
          id="emailAddr"
          name="emailAddr"
          type="email"
          required
          className="h-12 text-base"
          placeholder="maria@email.com"
          autoComplete="email"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-[var(--theme-radius)] px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="h-12 w-full text-base">
        {isPending ? "Enviando…" : "Enviar link de acesso"}
      </Button>
    </form>
  );
}
