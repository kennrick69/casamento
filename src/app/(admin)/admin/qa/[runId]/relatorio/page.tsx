import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { CHECKLIST } from "@/lib/qa/checklist";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { CopyMarkdownButton } from "./copy-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Relatório de QA" };

export default async function QAReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { runId } = await params;

  const run = await prisma.qATestRun.findFirst({
    where: { id: runId, createdById: session.user.id },
  });

  if (!run) notFound();

  const results = (run.results as Record<string, { status: string; note: string }>) ?? {};
  const total = CHECKLIST.length;
  const statuses = Object.values(results);
  const okCount = statuses.filter((r) => r.status === "ok").length;
  const bugCount = statuses.filter((r) => r.status === "bug").length;
  const skipCount = statuses.filter((r) => r.status === "skip").length;
  const notTested = total - okCount - bugCount - skipCount;

  const duration =
    run.finishedAt
      ? `${differenceInMinutes(run.finishedAt, run.startedAt)} min`
      : "Em progresso";

  const bugs = CHECKLIST.filter((item) => results[item.id]?.status === "bug");
  const skipped = CHECKLIST.filter((item) => results[item.id]?.status === "skip");

  const bugsGrouped = new Map<string, typeof bugs>();
  for (const item of bugs) {
    const arr = bugsGrouped.get(item.section) ?? [];
    arr.push(item);
    bugsGrouped.set(item.section, arr);
  }

  const skippedGrouped = new Map<string, typeof skipped>();
  for (const item of skipped) {
    const arr = skippedGrouped.get(item.section) ?? [];
    arr.push(item);
    skippedGrouped.set(item.section, arr);
  }

  let markdown = `# QA Report — ${run.title}\n`;
  markdown += `**Data:** ${format(run.startedAt, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}  **Duração:** ${duration}\n\n`;
  markdown += `## Resumo\n`;
  markdown += `- Total de itens: ${total}\n`;
  markdown += `- ✅ OK: ${okCount}\n`;
  markdown += `- ⚠️ Bugs: ${bugCount}\n`;
  markdown += `- ⏭️ Pulados: ${skipCount}\n`;
  markdown += `- ⬜ Não testados: ${notTested}\n\n`;

  if (bugs.length > 0) {
    markdown += `## Bugs encontrados\n\n`;
    for (const [section, items] of bugsGrouped) {
      markdown += `### ${section}\n`;
      for (const item of items) {
        const note = results[item.id]?.note ?? "";
        markdown += `- **${item.title}** — https://joseeleticia.com${item.url}\n`;
        if (note) markdown += `  ${note}\n`;
      }
      markdown += "\n";
    }
  }

  if (skipped.length > 0) {
    markdown += `## Itens pulados\n\n`;
    for (const [section, items] of skippedGrouped) {
      markdown += `### ${section}\n`;
      for (const item of items) {
        const note = results[item.id]?.note ?? "";
        markdown += `- **${item.title}** — https://joseeleticia.com${item.url}\n`;
        if (note) markdown += `  ${note}\n`;
      }
      markdown += "\n";
    }
  }

  const okWithNote = CHECKLIST.filter(
    (item) => results[item.id]?.status === "ok" && (results[item.id]?.note ?? "").trim().length > 0,
  );
  if (okWithNote.length > 0) {
    const okGrouped = new Map<string, typeof okWithNote>();
    for (const item of okWithNote) {
      const arr = okGrouped.get(item.section) ?? [];
      arr.push(item);
      okGrouped.set(item.section, arr);
    }
    markdown += `## Observações em itens OK\n\n`;
    for (const [section, items] of okGrouped) {
      markdown += `### ${section}\n`;
      for (const item of items) {
        const note = results[item.id]?.note ?? "";
        markdown += `- **${item.title}** — https://joseeleticia.com${item.url}\n`;
        if (note) markdown += `  ${note}\n`;
      }
      markdown += "\n";
    }
  }

  if (run.notes) {
    markdown += `## Notas gerais\n${run.notes}\n`;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/qa/${run.id}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Execução
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/admin/qa" className="text-sm text-muted-foreground hover:text-foreground">
            QA Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-semibold">Relatório</h1>
        </div>
        <CopyMarkdownButton markdown={markdown} />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <StatCard label="Total" value={total} />
          <StatCard label="✅ OK" value={okCount} color="green" />
          <StatCard label="⚠️ Bugs" value={bugCount} color="red" />
          <StatCard label="⬜ Não testados" value={notTested} />
        </div>

        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-medium text-sm">Markdown do relatório</h2>
          </div>
          <pre className="px-5 py-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap text-foreground font-mono">
            {markdown}
          </pre>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: "green" | "red" }) {
  return (
    <div className="bg-background rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-3xl font-bold tabular-nums leading-none ${
          color === "green"
            ? "text-green-700"
            : color === "red"
            ? "text-red-600"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
