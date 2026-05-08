import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [dbLatency, authErrors, rateLimitHits, eventCount, guestCount] = await Promise.all([
    (async () => {
      const t = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      return Date.now() - t;
    })(),
    prisma.authLog.count({
      where: {
        createdAt: { gte: since24h },
        action: { in: ["LOGIN_FAILED", "CAPTCHA_FAILED", "HONEYPOT_TRIGGERED", "RATE_LIMITED"] },
      },
    }),
    prisma.rateLimitAttempt.count({
      where: { createdAt: { gte: since24h } },
    }),
    prisma.event.count(),
    prisma.guest.count({ where: { deletedAt: null } }),
  ]);

  const avgQueryMs = dbLatency;

  const dbStatus = avgQueryMs > 500 ? "degraded" : avgQueryMs > 1000 ? "error" : "ok";

  return NextResponse.json(
    {
      db: { status: dbStatus, avgQueryMs },
      security: {
        authErrors24h: authErrors,
        rateLimitHits24h: rateLimitHits,
      },
      data: {
        events: eventCount,
        guests: guestCount,
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
