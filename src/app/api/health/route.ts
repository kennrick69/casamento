import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as fs from "fs";

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
  const volumePath = process.env.RAILWAY_VOLUME_PATH ?? "/tmp";
  try {
    const stats = await fs.promises.statfs(volumePath);
    const freeGb = (stats.bfree * stats.bsize) / 1024 ** 3;
    const totalGb = (stats.blocks * stats.bsize) / 1024 ** 3;
    const usedPct = Math.round(((totalGb - freeGb) / totalGb) * 100);
    if (freeGb < 0.1) {
      return { status: "error", detail: `disk critical: ${freeGb.toFixed(2)}GB free (${usedPct}% used)` };
    }
    if (freeGb < 0.5) {
      return { status: "degraded", detail: `disk low: ${freeGb.toFixed(2)}GB free (${usedPct}% used)` };
    }
    return { status: "ok", detail: `${freeGb.toFixed(1)}GB free / ${totalGb.toFixed(1)}GB total` };
  } catch {
    return { status: "degraded", detail: "statfs unavailable" };
  }
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
