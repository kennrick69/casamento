import Link from "next/link";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth/token";
import { ResetForm } from "./reset-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Redefinir senha" };

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  // Sem token na URL
  if (!token) {
    return <InvalidLink reason="missing" />;
  }

  const tokenHash = hashToken(token);
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    select: { expiresAt: true, usedAt: true },
  });

  const isValid = reset && !reset.usedAt && reset.expiresAt > new Date();

  if (!isValid) {
    return <InvalidLink reason={reset?.usedAt ? "used" : "expired"} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-serif text-3xl tracking-widest text-foreground">Voem.</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/40 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Criar nova senha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha uma senha segura para sua conta.
            </p>
          </div>
          <ResetForm token={token} />
        </div>
      </div>
    </div>
  );
}

function InvalidLink({ reason }: { reason: "missing" | "used" | "expired" }) {
  const msg =
    reason === "used"
      ? "Este link já foi utilizado."
      : "Este link expirou ou é inválido.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-serif text-3xl tracking-widest text-foreground">Voem.</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/40 p-8 text-center space-y-5">
          <div className="text-4xl">🔒</div>
          <div>
            <h1 className="text-xl font-semibold">Link inválido</h1>
            <p className="text-sm text-muted-foreground mt-2">{msg}</p>
          </div>
          <Link
            href="/forgot-password"
            className="inline-block text-sm bg-primary text-primary-foreground rounded-lg px-6 py-3 hover:opacity-90 transition-opacity"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    </div>
  );
}
