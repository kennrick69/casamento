"use client";

import { useState, useTransition } from "react";
import { declareDonation, startMpCheckout } from "./actions";

type DonationMode = "TRUST" | "PIX_PROOF" | "MERCADO_PAGO";

interface Props {
  giftId: string;
  slug: string;
  mode: DonationMode;
  amount: number;
  reserved?: boolean;
}

export function DonationButton({ giftId, slug, mode, amount, reserved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [localReserved, setLocalReserved] = useState(reserved ?? false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const amountLabel = amount > 0 ? `R$ ${amount.toFixed(2).replace(".", ",")}` : "";

  function handleTrust() {
    if (done) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("giftId", giftId);
      fd.set("slug", slug);
      fd.set("amount", String(amount || 0));
      const result = await declareDonation(fd);
      if (result.ok) {
        setDone(true);
        setLocalReserved(true);
      } else {
        setError(result.error ?? "Erro ao registrar promessa.");
      }
    });
  }

  function handleMp() {
    if (!amount || amount <= 0) {
      setError("Este presente não tem valor definido.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("giftId", giftId);
      fd.set("slug", slug);
      const result = await startMpCheckout(fd);
      if (result.ok) {
        window.location.href = result.initPoint;
      } else {
        setError(result.error);
      }
    });
  }

  if (mode === "MERCADO_PAGO") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={handleMp}
          disabled={isPending || !amount}
          className="w-full rounded-[var(--theme-radius)] bg-[#009ee3] text-white py-2.5 text-sm font-semibold hover:bg-[#0086c3] disabled:opacity-50 transition-colors"
        >
          {isPending ? "Aguarde…" : `Pagar ${amountLabel}`}
        </button>
        {!amount && (
          <p className="text-xs text-muted-foreground">Valor não definido — entre em contato com o casal.</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (mode === "PIX_PROOF") {
    return (
      <div className="flex flex-col gap-1.5">
        {done ? (
          <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
            Comprovante registrado — aguardando aprovação
          </p>
        ) : (
          <button
            onClick={handleTrust}
            disabled={isPending}
            className="text-xs rounded-[var(--theme-radius)] border border-[var(--theme-border)] px-3 py-2 font-medium hover:bg-[var(--theme-muted)] disabled:opacity-50"
          >
            {isPending ? "Registrando…" : "Confirmar que fiz o PIX"}
          </button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // TRUST mode
  return (
    <div className="flex flex-col gap-1.5">
      {done || localReserved ? (
        <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
          Promessa registrada ✓
        </p>
      ) : (
        <button
          onClick={handleTrust}
          disabled={isPending}
          className="text-xs rounded-[var(--theme-radius)] border border-[var(--theme-border)] px-3 py-2 font-medium hover:bg-[var(--theme-muted)] disabled:opacity-50"
        >
          {isPending ? "Registrando…" : "Confirmar que vou enviar PIX"}
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
