import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "./change-password-form";
import { updateProfile, updateNotifications } from "./actions";
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
          <h2 className="text-base font-semibold mb-5">Dados pessoais</h2>
          <form action={updateProfile} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Nome</Label>
                <Input id="firstName" name="firstName" defaultValue={user.firstName} required className="h-11" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input id="lastName" name="lastName" defaultValue={user.lastName} required className="h-11" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  readOnly
                  className="h-11 bg-muted cursor-not-allowed text-muted-foreground"
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="+55 11 99999-9999" className="h-11" />
            </div>

            <Button type="submit" className="h-11 self-start px-6">Salvar</Button>
          </form>
        </section>

        {/* ── Segurança / Alterar senha ───────────────────────────────── */}
        <section className="bg-background rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold mb-1">Segurança</h2>
          {user.passwordHash ? (
            <>
              <p className="text-xs text-muted-foreground mb-5">Altere sua senha a qualquer momento.</p>
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
          <form action={updateNotifications} className="flex flex-col gap-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="marketingOptIn"
                defaultChecked={user.marketingOptIn}
                className="mt-0.5 size-4"
              />
              <span className="text-sm">Receber novidades, dicas de planejamento e atualizações do Voem.</span>
            </label>
            <Button type="submit" className="h-11 self-start px-6">Salvar preferências</Button>
          </form>
        </section>
      </main>
    </div>
  );
}
