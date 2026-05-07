import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invito — Casamentos memoráveis começam aqui",
  description:
    "Plataforma gratuita para noivos criarem o convite digital do casamento, gerenciar confirmações de presença e encantar os convidados.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-8 max-w-lg mx-auto w-full">
        {/* Hero */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Casamentos memoráveis
            <br />
            começam aqui
          </h1>
          <p className="text-base text-zinc-500 leading-relaxed max-w-sm mx-auto">
            Plataforma gratuita para noivos criarem o convite digital, gerenciar
            confirmações de presença e encantar os convidados com mural de fotos,
            playlist colaborativa e muito mais.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/admin"
            className="flex h-14 items-center justify-center rounded-2xl bg-zinc-900 text-white text-base font-semibold transition-opacity hover:opacity-80"
          >
            Sou noivo — criar meu evento
          </Link>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-500 leading-snug">
            <strong className="text-zinc-700">Sou convidado.</strong> Abra o link
            ou QR code do convite que você recebeu — ele vai te levar direto para
            o evento.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-center gap-6 pb-8 text-xs text-zinc-400">
        <Link href="/privacidade" className="hover:text-zinc-600 transition-colors">
          Privacidade
        </Link>
        <Link href="/termos" className="hover:text-zinc-600 transition-colors">
          Termos de uso
        </Link>
      </footer>
    </div>
  );
}
