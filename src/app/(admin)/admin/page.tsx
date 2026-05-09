import { auth } from "@/lib/auth";
import { getOrganizerEvents } from "@/lib/authorization";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus eventos" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const organizers = await getOrganizerEvents(session.user.id);

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

        {organizers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">💍</p>
            <p className="font-medium mb-2">Nenhum evento ainda</p>
            <p className="text-sm mb-6">Crie seu primeiro evento e compartilhe com os convidados.</p>
            <Link href="/admin/eventos/novo" className={buttonVariants()}>
              Criar evento
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {organizers.map(({ event }) => (
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
      </main>
    </div>
  );
}
