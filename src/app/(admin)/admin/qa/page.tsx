import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CHECKLIST } from "@/lib/qa/checklist";
import { createQARun } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "QA Dashboard" };

export default async function QAPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const runs = await prisma.qATestRun.findMany({
    where: { createdById: session.user.id },
    orderBy: { startedAt: "desc" },
  });

  const total = CHECKLIST.length;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Meus eventos
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-semibold">QA Dashboard</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-background rounded-xl border border-border px-5 py-4 mb-6">
          <h2 className="font-medium mb-3">Nova execução de testes</h2>
          <form action={createQARun} className="flex gap-3">
            <input
              name="title"
              type="text"
              placeholder={`QA ${format(new Date(), "d 'de' MMMM", { locale: ptBR })}`}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Nova execução
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">{total} itens no checklist</p>
        </div>

        {runs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-3">🧪</p>
            <p className="font-medium">Nenhuma execução ainda</p>
            <p className="text-sm mt-1">Crie a primeira execução para começar os testes.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Execuções anteriores
            </h2>
            {runs.map((run) => {
              const results = (run.results as Record<string, { status: string; note: string }>) ?? {};
              const statuses = Object.values(results);
              const ok = statuses.filter((r) => r.status === "ok").length;
              const bug = statuses.filter((r) => r.status === "bug").length;
              const skip = statuses.filter((r) => r.status === "skip").length;
              const tested = ok + bug + skip;
              const finalized = Boolean(run.finishedAt);

              return (
                <div
                  key={run.id}
                  className="bg-background rounded-xl border border-border px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium">{run.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(run.startedAt, "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        finalized
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {finalized ? "Finalizado" : "Em progresso"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                    <span>
                      {tested}/{total} testados
                    </span>
                    <span className="text-green-700 font-medium">✅ {ok} OK</span>
                    <span className="text-red-600 font-medium">⚠️ {bug} Bug{bug !== 1 ? "s" : ""}</span>
                    <span>⏭️ {skip} Pulados</span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${total > 0 ? (tested / total) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="flex gap-3 text-sm">
                    <Link
                      href={`/admin/qa/${run.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      Ver execução
                    </Link>
                    <Link
                      href={`/admin/qa/${run.id}/relatorio`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Relatório
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
