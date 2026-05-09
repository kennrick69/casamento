import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResendButton } from "./resend-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { error } = await searchParams;

  const userEmail = session.user.email ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-serif text-3xl tracking-widest text-foreground">Voem.</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/40 p-8 text-center space-y-5">
          <div className="text-4xl">📬</div>

          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Confirme seu e-mail</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um link para{" "}
              <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          </div>

          {error === "expired" && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-2">
              Link expirado. Solicite um novo abaixo.
            </p>
          )}
          {error === "invalid" && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">
              Link inválido. Solicite um novo abaixo.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Não encontrou? Verifique a pasta de spam. O link expira em 24 horas.
          </p>

          <ResendButton />
        </div>
      </div>
    </div>
  );
}
