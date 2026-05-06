import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Presença confirmada!" };

export default async function RsvpSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { slug } = await params;
  const { status } = await searchParams;
  const confirmed = status !== "DECLINED";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
      {confirmed ? (
        <>
          <CheckCircle size={56} className="text-green-500" />
          <div className="flex flex-col gap-2">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--theme-font-heading)" }}
            >
              Presença confirmada! 🎉
            </h1>
            <p className="text-sm text-[var(--theme-secondary)]">
              Mal podemos esperar para celebrar com você.
            </p>
          </div>

          {/* Prévia de pontos — espaço visual para Fase 4 */}
          <div className="w-full max-w-xs rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3 text-center">
            <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-1">
              Gincana
            </p>
            <p className="text-lg font-semibold">+100 pontos</p>
            <p className="text-xs text-[var(--theme-secondary)]">
              pela confirmação antecipada
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <p className="text-xs font-medium text-[var(--theme-secondary)] uppercase tracking-wider">
              Próximos passos
            </p>
            <NextStep href={`/${slug}/roteiro`} label="Ver roteiro do dia" emoji="🗓" />
            <NextStep href={`/${slug}/local`} label="Como chegar" emoji="📍" />
            <NextStep href={`/${slug}/presentes`} label="Lista de presentes" emoji="🎁" />
          </div>
        </>
      ) : (
        <>
          <p className="text-5xl">💙</p>
          <div className="flex flex-col gap-2">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--theme-font-heading)" }}
            >
              Recebemos sua resposta
            </h1>
            <p className="text-sm text-[var(--theme-secondary)]">
              Sentiremos muito a sua falta.
            </p>
          </div>
          <Link
            href={`/${slug}`}
            className={buttonVariants({ variant: "outline", className: "w-full max-w-xs justify-center" })}
          >
            Voltar ao início
          </Link>
        </>
      )}
    </div>
  );
}

function NextStep({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <Link
      href={href}
      className={buttonVariants({
        variant: "outline",
        className: "w-full h-12 justify-start gap-3 text-sm",
      })}
    >
      <span className="text-base">{emoji}</span>
      {label}
    </Link>
  );
}
