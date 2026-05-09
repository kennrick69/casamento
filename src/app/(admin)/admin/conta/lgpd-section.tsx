"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";

export function LgpdSection() {
  const [step, setStep] = useState<"idle" | "confirm1" | "confirm2">("idle");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const form = new FormData();
      form.set("confirmation", confirmation);
      const result = await deleteAccount(form);
      if (!result.ok) setError(result.error ?? "Erro desconhecido.");
    });
  }

  return (
    <section className="bg-background rounded-lg border border-border p-6">
      <h2 className="text-base font-semibold mb-1">Dados e privacidade</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Conforme a LGPD (Lei 13.709/2018), você tem o direito de exportar ou excluir seus dados.
      </p>

      <div className="flex flex-col gap-3">
        {/* Export */}
        <a
          href="/api/admin/lgpd/export"
          download
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors w-fit"
        >
          ↓ Exportar todos os meus dados (ZIP)
        </a>

        {/* Delete account */}
        {step === "idle" && (
          <button
            onClick={() => setStep("confirm1")}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors w-fit"
          >
            Excluir minha conta
          </button>
        )}

        {step === "confirm1" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-destructive">Tem certeza?</p>
            <p className="text-xs text-muted-foreground">
              Isso excluirá permanentemente sua conta e todos os dados associados.
              Esta ação <strong>não pode ser desfeita</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("confirm2")}
                className="rounded-md bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, quero excluir
              </button>
              <button
                onClick={() => setStep("idle")}
                className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === "confirm2" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-destructive">Confirmação final</p>
            <p className="text-xs text-muted-foreground">
              Digite <code className="font-mono bg-muted px-1 rounded">excluir minha conta</code> para confirmar:
            </p>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="excluir minha conta"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              autoComplete="off"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending || confirmation !== "excluir minha conta"}
                className="rounded-md bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Excluindo…" : "Excluir definitivamente"}
              </button>
              <button
                onClick={() => { setStep("idle"); setError(null); setConfirmation(""); }}
                className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
