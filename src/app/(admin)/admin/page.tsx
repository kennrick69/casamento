import { auth } from "@/lib/auth";
import { getOrganizerEvents } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { unarchiveEvent } from "@/app/(admin)/admin/eventos/[id]/configuracoes/actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, RotateCcw } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus eventos" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ todos?: string; arquivados?: string }>;
}) {
  const sp = await searchParams;
  const showList = sp.todos === "1";
  const showArchived = sp.arquivados === "1";

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // MEL-3: primeiro login → onboarding. A flag onboardingCompleted vira true
  // ao fim do tour; aqui é o gate que evita pular o tour direto pro painel.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  });
  if (user && !user.onboardingCompleted) redirect("/admin/onboarding");

  const organizers = await getOrganizerEvents(session.user.id);
  const active = organizers.filter(({ event }) => event.status !== "ARCHIVED");
  const archived = organizers.filter(({ event }) => event.status === "ARCHIVED");

  // Login abre direto no evento quando há um único evento ativo (a não ser que
  // o usuário peça explicitamente a lista com ?todos=1).
  if (!showList && active.length === 1) {
    redirect(`/admin/eventos/${active[0]!.event.id}`);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Painel dos noivos</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{session.user.email}</span>
          <Link href="/admin/visao-geral" className="hover:text-foreground transition-colors">
            Visão geral
          </Link>
          <Link href="/admin/saude" className="hover:text-foreground transition-colors">
            Saúde
          </Link>
          <Link href="/admin/qa" className="hover:text-foreground transition-colors">
            QA
          </Link>
          <Link href="/admin/conta" className="hover:text-foreground transition-colors">
            Minha conta
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Meus eventos</h2>
          <Link
            href="/admin/eventos/novo"
            className={buttonVariants()}
          >
            + Novo evento
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="size-10 mx-auto mb-4 text-muted-foreground" aria-hidden />
            <p className="font-medium mb-2">Nenhum evento ainda</p>
            <p className="text-sm mb-6">Crie seu primeiro evento e compartilhe com os convidados.</p>
            <Link href="/admin/eventos/novo" className={buttonVariants()}>
              Criar evento
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map(({ event }) => (
              <li key={event.id}>
                <Link
                  href={`/admin/eventos/${event.id}`}
                  className="flex items-center justify-between bg-background rounded-lg border border-border px-5 py-4 hover:border-primary/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{event.coupleNames}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(event.ceremonyDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {" · "}
                      <span className="font-mono text-xs">/{event.slug}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        event.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : event.status === "ARCHIVED"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.status === "PUBLISHED"
                        ? "Publicado"
                        : event.status === "ARCHIVED"
                        ? "Arquivado"
                        : "Rascunho"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <div className="mt-8">
            {!showArchived ? (
              <Link
                href="/admin?todos=1&arquivados=1"
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                Mostrar arquivados ({archived.length})
              </Link>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Arquivados</h3>
                  <Link href="/admin?todos=1" className="text-xs text-muted-foreground underline hover:text-foreground">
                    Ocultar
                  </Link>
                </div>
                <ul className="flex flex-col gap-2">
                  {archived.map(({ event }) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between bg-muted/40 rounded-lg border border-border px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-muted-foreground truncate">{event.coupleNames}</p>
                        <p className="text-xs text-muted-foreground font-mono">/{event.slug}</p>
                      </div>
                      <form action={unarchiveEvent}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button
                          type="submit"
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <RotateCcw className="size-3.5 mr-1" aria-hidden />
                          Recuperar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
