"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Fronteira de erro do Modo Gamificado: qualquer exceção inesperada em /jogo (e
// subrotas) vira uma tela amigável — nunca uma página em branco (feedback do
// JOs, item 9). O progresso fica salvo no servidor.
export default function JogoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  useEffect(() => {
    console.error("[jogo] erro capturado:", error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-neutral-900 p-6 text-center text-neutral-100">
      <p className="text-xl font-bold">Ops! Algo saiu do lugar na festa.</p>
      <p className="max-w-sm text-sm text-neutral-400">
        Não se preocupe — seu progresso está salvo. É só tentar de novo.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl border-2 border-emerald-400 bg-emerald-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-emerald-500"
        >
          Tentar de novo
        </button>
        {slug && (
          <Link href={`/${slug}/jogo`} className="rounded-xl bg-neutral-700 px-6 py-3 font-semibold hover:bg-neutral-600">
            Voltar ao início do jogo
          </Link>
        )}
      </div>
    </div>
  );
}
