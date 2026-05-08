"use client";

import { useEffect, useState, useTransition } from "react";
import { resendVerificationEmail } from "./actions";

export function ResendButton() {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  function handleResend() {
    startTransition(async () => {
      const result = await resendVerificationEmail();
      if (result.ok) {
        setStatus("sent");
        setSecondsLeft(60);
      } else {
        setStatus("error");
      }
    });
  }

  const canResend = secondsLeft <= 0 && !isPending;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleResend}
        disabled={!canResend}
        className="text-sm text-primary underline underline-offset-4 disabled:no-underline disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
      >
        {isPending
          ? "Enviando..."
          : secondsLeft > 0
          ? `Reenviar e-mail (${secondsLeft}s)`
          : "Reenviar e-mail"}
      </button>
      {status === "sent" && (
        <p className="text-xs text-green-600">E-mail reenviado! Verifique sua caixa de entrada.</p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-500">Falha ao enviar. Tente novamente.</p>
      )}
    </div>
  );
}
