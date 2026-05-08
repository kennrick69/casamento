"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptTerms } from "./actions";

export function AcceptTermsForm() {
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checked) return;
    startTransition(async () => {
      await acceptTerms();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 size-4 shrink-0"
        />
        <span className="text-sm leading-relaxed">
          Li e aceito os{" "}
          <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Política de Privacidade
          </a>{" "}
          do Voem.
        </span>
      </label>

      <Button type="submit" className="h-11 w-full" disabled={!checked || isPending}>
        {isPending ? "Salvando…" : "Aceitar e continuar"}
      </Button>
    </form>
  );
}
