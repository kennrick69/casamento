import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChangePasswordForm } from "./change-password-form";
import { ProfileForm } from "./profile-form";
import { NotificationsForm } from "./notifications-form";
import { LgpdSection } from "./lgpd-section";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Minha conta" };

interface Props {
  searchParams: Promise<{ changed?: string }>;
}

export default async function ContaPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { changed } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      marketingOptIn: true,
      emailVerified: true,
      passwordHash: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <Link href="/admin" className="font-semibold text-lg hover:opacity-70 transition-opacity">
          ← Meus eventos
        </Link>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Minha conta</h1>

        {changed === "1" && (
          <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            Senha alterada com sucesso.
          </p>
        )}

        {/* ── Dados pessoais ─────────────────────────────────────────── */}
        <section className="bg-background rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold mb-4">Dados pessoais</h2>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-sm font-medium">E-mail</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={user.email}
                readOnly
                className="h-11 flex-1 rounded-md border border-input bg-muted px-3 text-sm cursor-not-allowed text-muted-foreground"
              />
              {user.emailVerified ? (
                <span className="text-xs text-green-600 whitespace-nowrap">✓ verificado</span>
              ) : (
                <Link href="/verify-email" className="text-xs text-amber-600 whitespace-nowrap underline underline-offset-2">
                  verificar
                </Link>
              )}
            </div>
          </div>
          <ProfileForm firstName={user.firstName} lastName={user.lastName} phone={user.phone} />
        </section>

        {/* ── Segurança / Alterar senha ───────────────────────────────── */}
        <section className="bg-background rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold mb-3">Segurança</h2>
          {user.passwordHash ? (
            <>
              <p className="text-sm text-muted-foreground mb-5">Altere sua senha a qualquer momento.</p>
              <ChangePasswordForm />
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-3">
              Sua conta usa acesso via link mágico.{" "}
              <Link href="/forgot-password" className="underline underline-offset-2 hover:text-foreground">
                Defina uma senha
              </Link>{" "}
              para poder entrar também com e-mail e senha.
            </p>
          )}
        </section>

        {/* ── Notificações ───────────────────────────────────────────── */}
        <section className="bg-background rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold mb-5">Notificações</h2>
          <NotificationsForm marketingOptIn={user.marketingOptIn} />
        </section>

        {/* ── LGPD / Dados e privacidade ─────────────────────────────── */}
        <LgpdSection />
      </main>
    </div>
  );
}
