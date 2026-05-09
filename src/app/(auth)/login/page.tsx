import type { Metadata } from "next";
import { AuthTabs } from "@/components/auth/auth-tabs";

export const metadata: Metadata = { title: "Entrar" };

interface Props {
  searchParams: Promise<{ verified?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { verified } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-rose-50 via-white to-slate-50">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <h1
            className="text-4xl font-light tracking-widest text-slate-800"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Voem.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel dos noivos</p>
        </div>

        {verified === "1" && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 text-center">
            E-mail verificado com sucesso! Faça login para continuar.
          </div>
        )}

        {/* Card */}
        <div className="relative rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
          <AuthTabs />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sua plataforma de convite interativo
        </p>
      </div>
    </div>
  );
}
