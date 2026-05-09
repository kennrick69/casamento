import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import * as fs from "fs";

export const metadata: Metadata = { title: "Status do Sistema" };
export const revalidate = 60; // refresh every minute

type Status = "operational" | "degraded" | "down";

async function getSystemStatus(): Promise<{
  overall: Status;
  db: { status: Status; latencyMs: number };
  storage: { status: Status; detail: string };
  uptime30Days: number;
  recentIncidents: { date: string; description: string }[];
}> {
  // DB check
  const dbStart = Date.now();
  let dbStatus: Status = "operational";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "down";
  }
  const dbLatencyMs = Date.now() - dbStart;
  if (dbStatus === "operational" && dbLatencyMs > 500) dbStatus = "degraded";

  // Storage check
  let storageStatus: Status = "operational";
  let storageDetail = "OK";
  try {
    const volumePath = process.env.RAILWAY_VOLUME_PATH ?? "/tmp";
    const stats = fs.statfsSync(volumePath);
    const freeGb = (stats.bfree * stats.bsize) / 1024 ** 3;
    if (freeGb < 0.1) { storageStatus = "down"; storageDetail = `${freeGb.toFixed(2)} GB livres`; }
    else if (freeGb < 0.5) { storageStatus = "degraded"; storageDetail = `${freeGb.toFixed(2)} GB livres`; }
    else storageDetail = `${freeGb.toFixed(1)} GB livres`;
  } catch {
    storageDetail = "indisponível";
  }

  // Uptime: count days in last 30 with BACKUP_FAILED as incident proxy
  const since30 = subDays(new Date(), 30);
  const failures = await prisma.authLog.findMany({
    where: { action: "BACKUP_FAILED", createdAt: { gte: since30 } },
    select: { createdAt: true, metadata: true },
    orderBy: { createdAt: "desc" },
  });

  const incidentDays = new Set(
    failures.map((f) => format(startOfDay(f.createdAt), "yyyy-MM-dd"))
  );
  const uptimePct = Math.round(((30 - incidentDays.size) / 30) * 1000) / 10;

  const recentIncidents = [...incidentDays].slice(0, 5).map((date) => ({
    date,
    description: "Falha no backup automatizado",
  }));

  const overall: Status =
    dbStatus === "down" || storageStatus === "down"
      ? "down"
      : dbStatus === "degraded" || storageStatus === "degraded"
      ? "degraded"
      : "operational";

  return {
    overall,
    db: { status: dbStatus, latencyMs: dbLatencyMs },
    storage: { status: storageStatus, detail: storageDetail },
    uptime30Days: uptimePct,
    recentIncidents,
  };
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; color: string; dot: string }> = {
    operational: { label: "Operacional", color: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500" },
    degraded: { label: "Degradado", color: "text-yellow-700 bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" },
    down: { label: "Indisponível", color: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" },
  };
  const { label, color, dot } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

const OVERALL_LABEL: Record<Status, { text: string; bg: string; textColor: string }> = {
  operational: { text: "Todos os sistemas operacionais", bg: "bg-green-50 border-green-200", textColor: "text-green-800" },
  degraded: { text: "Desempenho degradado em alguns sistemas", bg: "bg-yellow-50 border-yellow-200", textColor: "text-yellow-800" },
  down: { text: "Interrupção de serviço detectada", bg: "bg-red-50 border-red-200", textColor: "text-red-800" },
};

export default async function StatusPage() {
  const data = await getSystemStatus();
  const overall = OVERALL_LABEL[data.overall];
  const now = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg hover:opacity-70 transition-opacity">
          Voem.
        </Link>
        <span className="text-sm text-muted-foreground">Status do Sistema</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Overall banner */}
        <div className={`rounded-xl border px-6 py-5 ${overall.bg}`}>
          <p className={`text-lg font-semibold ${overall.textColor}`}>{overall.text}</p>
          <p className="text-xs text-muted-foreground mt-1">Atualizado em {now} · Atualiza a cada 60s</p>
        </div>

        {/* Components */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Componentes</h2>
          <div className="flex flex-col gap-2">
            <div className="bg-background rounded-lg border border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Banco de dados</p>
                <p className="text-xs text-muted-foreground">{data.db.latencyMs}ms de latência</p>
              </div>
              <StatusBadge status={data.db.status} />
            </div>
            <div className="bg-background rounded-lg border border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Armazenamento</p>
                <p className="text-xs text-muted-foreground">{data.storage.detail}</p>
              </div>
              <StatusBadge status={data.storage.status} />
            </div>
          </div>
        </section>

        {/* Uptime */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Uptime — últimos 30 dias</h2>
          <div className="bg-background rounded-lg border border-border px-4 py-4">
            <p className="text-3xl font-bold tabular-nums">{data.uptime30Days}%</p>
            <p className="text-xs text-muted-foreground mt-1">Baseado em execuções de backup automatizadas</p>
          </div>
        </section>

        {/* Recent incidents */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Incidentes recentes ({data.recentIncidents.length})
          </h2>
          {data.recentIncidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum incidente nos últimos 30 dias.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.recentIncidents.map((inc) => (
                <div key={inc.date} className="bg-background rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p className="text-sm font-medium text-yellow-800">{inc.description}</p>
                  <p className="text-xs text-muted-foreground">{inc.date}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact */}
        <section className="border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Problemas com o sistema?{" "}
            <a href="mailto:suporte@voem.app" className="underline underline-offset-2 hover:text-foreground">
              suporte@voem.app
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
