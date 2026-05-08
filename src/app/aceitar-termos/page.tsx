import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions";
import { AcceptTermsForm } from "./accept-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Atualização dos termos" };

export default async function AceitarTermosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Se já está em dia, não precisa ficar nesta página
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsVersion: true, privacyVersion: true },
  });
  if (user?.termsVersion === TERMS_VERSION && user?.privacyVersion === PRIVACY_VERSION) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-xl border border-border shadow-sm p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-2xl">📋</p>
          <h1 className="text-xl font-semibold">Documentos atualizados</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Atualizamos nossos Termos de Uso e Política de Privacidade. Por favor,
            leia os documentos e aceite para continuar usando o painel.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <a
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-primary/50 transition-colors"
          >
            <span>Termos de Uso</span>
            <span className="text-xs text-muted-foreground font-mono">v{TERMS_VERSION} ↗</span>
          </a>
          <a
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-primary/50 transition-colors"
          >
            <span>Política de Privacidade</span>
            <span className="text-xs text-muted-foreground font-mono">v{PRIVACY_VERSION} ↗</span>
          </a>
        </div>

        <AcceptTermsForm />
      </div>
    </div>
  );
}
