"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function MagicAuth() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!token) {
      startTransition(() => setStatus("error"));
      return;
    }

    signIn("magic-link", { token, redirect: false })
      .then((result) => {
        if (result?.ok && !result.error) {
          router.replace("/admin");
        } else {
          startTransition(() => setStatus("error"));
        }
      })
      .catch(() => startTransition(() => setStatus("error")));
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-rose-50 via-white to-slate-50">
      <div className="w-full max-w-sm text-center space-y-4">
        {status === "loading" ? (
          <>
            <div className="text-4xl">🔐</div>
            <h1 className="text-xl font-semibold">Entrando na sua conta...</h1>
            <p className="text-sm text-muted-foreground">
              Aguarde um instante enquanto validamos seu link.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl">⏰</div>
            <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground">
              Este link já foi usado ou passou de 24 horas. Solicite um novo na tela de login.
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Voltar para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
