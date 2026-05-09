"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type CheckStatus = "ok" | "degraded" | "error" | "loading";

interface HealthCheck {
  status: CheckStatus;
  latencyMs?: number;
  detail?: string;
}

interface MemoryCheck extends HealthCheck {
  usedMb: number;
  heapMb: number;
  rssMb: number;
}

interface HealthData {
  status: CheckStatus;
  db: HealthCheck;
  pusher: HealthCheck;
  storage: HealthCheck;
  memory: MemoryCheck;
  timestamp: string;
}

interface DeepData {
  db: { status: string; avgQueryMs: number };
  security: { authErrors24h: number; rateLimitHits24h: number };
  data: { events: number; guests: number };
  uptime: number;
  nodeVersion: string;
  timestamp: string;
}

const STATUS_COLORS: Record<CheckStatus, string> = {
  ok: "bg-green-100 text-green-800 border-green-200",
  degraded: "bg-yellow-100 text-yellow-800 border-yellow-200",
  error: "bg-red-100 text-red-800 border-red-200",
  loading: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_DOTS: Record<CheckStatus, string> = {
  ok: "bg-green-500",
  degraded: "bg-yellow-500",
  error: "bg-red-500",
  loading: "bg-gray-400 animate-pulse",
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  ok: "OK",
  degraded: "Degradado",
  error: "Erro",
  loading: "Carregando",
};

function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function CheckCard({
  title,
  check,
  extra,
}: {
  title: string;
  check: HealthCheck;
  extra?: React.ReactNode;
}) {
  const status = check?.status ?? "loading";
  return (
    <div className={`rounded-xl border px-5 py-4 ${status === "error" ? "border-red-200 bg-red-50" : status === "degraded" ? "border-yellow-200 bg-yellow-50" : "border-border bg-background"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-sm">{title}</p>
        <StatusBadge status={status} />
      </div>
      {check?.latencyMs !== undefined && (
        <p className="text-xs text-muted-foreground">{check.latencyMs}ms</p>
      )}
      {check?.detail && (
        <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{check.detail}</p>
      )}
      {extra}
    </div>
  );
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function HealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [deep, setDeep] = useState<DeepData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);

  const fetchHealth = useCallback(async () => {
    try {
      const [hRes, dRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/health/deep", { cache: "no-store" }),
      ]);
      if (hRes.ok) setHealth(await hRes.json());
      if (dRes.ok) setDeep(await dRes.json());
      setLastUpdated(new Date());
      setCountdown(30);
    } catch {
      // keep previous data
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const overallStatus: CheckStatus = health?.status ?? "loading";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Painel
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-semibold">Saúde do sistema</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={overallStatus} />
          <button
            onClick={fetchHealth}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Atualizar ({countdown}s)
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex gap-3 mb-6">
          <Link href="/admin/saude/backups" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
            Ver backups →
          </Link>
        </div>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground mb-6">
            Última verificação: {lastUpdated.toLocaleTimeString("pt-BR")} · atualiza a cada 30s
          </p>
        )}

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Serviços
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckCard
              title="Banco de dados"
              check={health?.db ?? { status: "loading" }}
            />
            <CheckCard
              title="Realtime (Pusher)"
              check={health?.pusher ?? { status: "loading" }}
            />
            <CheckCard
              title="Armazenamento"
              check={health?.storage ?? { status: "loading" }}
            />
            <CheckCard
              title="Memória"
              check={health?.memory ?? { status: "loading" }}
              extra={
                health?.memory && (
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>RSS: {health.memory.rssMb}MB</span>
                    <span>Heap: {health.memory.heapMb}MB</span>
                  </div>
                )
              }
            />
          </div>
        </section>

        {deep && (
          <>
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Segurança (últimas 24h)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Erros de auth", value: deep.security.authErrors24h, warn: 50 },
                  { label: "Rate limits", value: deep.security.rateLimitHits24h, warn: 100 },
                  { label: "Eventos", value: deep.data.events },
                  { label: "Convidados", value: deep.data.guests },
                ].map(({ label, value, warn }) => (
                  <div
                    key={label}
                    className={`rounded-xl border px-4 py-3 ${warn && value >= warn ? "border-yellow-200 bg-yellow-50" : "border-border bg-background"}`}
                  >
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-3xl font-bold tabular-nums leading-none ${warn && value >= warn ? "text-yellow-700" : ""}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Runtime
              </h2>
              <div className="bg-background rounded-xl border border-border px-5 py-4">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Uptime</dt>
                    <dd className="font-medium">{formatUptime(deep.uptime)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Node</dt>
                    <dd className="font-medium font-mono">{deep.nodeVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">DB latência</dt>
                    <dd className="font-medium">{deep.db.avgQueryMs}ms</dd>
                  </div>
                </dl>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
