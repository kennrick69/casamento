import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";
import { resolveVolumeBase, hasPersistentVolume, isRailwayRuntime } from "@/lib/storage/volume-path";

type CheckStatus = "ok" | "degraded" | "error";

interface HealthCheck {
  status: CheckStatus;
  latencyMs?: number;
  detail?: string;
}

interface HealthResponse {
  status: CheckStatus;
  db: HealthCheck;
  pusher: HealthCheck;
  storage: HealthCheck;
  memory: HealthCheck & { usedMb: number; heapMb: number; rssMb: number };
  timestamp: string;
}

async function checkDb(): Promise<HealthCheck> {
  const t = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - t };
  } catch (err) {
    return { status: "error", latencyMs: Date.now() - t, detail: String(err) };
  }
}

function checkPusher(): HealthCheck {
  const required = ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return { status: "degraded", detail: `missing env: ${missing.join(", ")}` };
  }
  return { status: "ok" };
}

async function checkStorage(): Promise<HealthCheck> {
  // Mesma base que o upload de fotos usa de fato (ver resolveVolumeBase).
  const base = resolveVolumeBase();
  const persistent = hasPersistentVolume();
  const onRailway = isRailwayRuntime();

  // Teste de escrita REAL: cria o diretório (igual ao upload, que faz mkdir
  // recursivo) e grava/remove um arquivo de prova. Assim o health reflete
  // exatamente o que o envio de fotos vai encontrar.
  let writable = false;
  let writeError: string | null = null;
  try {
    const probeDir = path.join(base, ".health");
    const probePath = path.join(probeDir, `probe-${Date.now()}`);
    await fs.promises.mkdir(probeDir, { recursive: true });
    await fs.promises.writeFile(probePath, "ok");
    await fs.promises.unlink(probePath);
    writable = true;
  } catch (err) {
    writeError = err instanceof Error ? err.message : String(err);
  }

  // Espaço livre (quando o runtime suporta statfs).
  let spaceDetail = "";
  try {
    const stats = await fs.promises.statfs(base);
    const freeGb = (stats.bfree * stats.bsize) / 1024 ** 3;
    const totalGb = (stats.blocks * stats.bsize) / 1024 ** 3;
    const usedPct = Math.round(((totalGb - freeGb) / totalGb) * 100);
    spaceDetail = ` · ${freeGb.toFixed(1)}GB livre / ${totalGb.toFixed(1)}GB (${usedPct}% usado)`;
    if (writable && freeGb < 0.1) {
      return { status: "error", detail: `disco crítico em ${base}:${spaceDetail}` };
    }
    if (writable && freeGb < 0.5) {
      return { status: "degraded", detail: `disco baixo em ${base}:${spaceDetail}` };
    }
  } catch {
    // statfs indisponível nesse runtime — segue só com o teste de escrita.
  }

  if (!writable) {
    return { status: "degraded", detail: `volume não gravável (${base}): ${writeError}` };
  }

  // Grava, mas em produção no Railway SEM Volume anexado → armazenamento
  // efêmero: a foto some no próximo deploy. Isso é degradado, não "ok".
  if (onRailway && !persistent) {
    return {
      status: "degraded",
      detail:
        `gravável mas EFÊMERO em ${base}: nenhum Volume Railway anexado ` +
        `(RAILWAY_VOLUME_MOUNT_PATH ausente). As fotos somem no próximo deploy.`,
    };
  }

  const kind = persistent ? "volume persistente" : "fallback local";
  return { status: "ok", detail: `gravável · ${kind} em ${base}${spaceDetail}` };
}

function checkMemory(): HealthResponse["memory"] {
  const mem = process.memoryUsage();
  const usedMb = Math.round(mem.rss / 1024 / 1024);
  const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  const status: CheckStatus = usedMb > 900 ? "degraded" : "ok";
  return { status, usedMb, heapMb, rssMb };
}

export async function GET() {
  const [db, storage] = await Promise.all([checkDb(), checkStorage()]);
  const pusher = checkPusher();
  const memory = checkMemory();

  const checks: CheckStatus[] = [db.status, pusher.status, storage.status, memory.status];
  const overallStatus: CheckStatus = checks.includes("error")
    ? "error"
    : checks.includes("degraded")
    ? "degraded"
    : "ok";

  const body: HealthResponse = {
    status: overallStatus,
    db,
    pusher,
    storage,
    memory,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
