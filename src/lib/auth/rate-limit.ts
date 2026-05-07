import { prisma } from "@/lib/db";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkRateLimit(
  key: string,
  ip: string,
  maxAttempts: number,
  windowMinutes: number,
  userAgent?: string
): Promise<RateLimitResult> {
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);

  const count = await prisma.rateLimitAttempt.count({
    where: {
      key,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= maxAttempts) {
    // Encontra o attempt mais antigo da janela para calcular quando expira
    const oldest = await prisma.rateLimitAttempt.findFirst({
      where: { key, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
    });
    const expiresAt = oldest
      ? oldest.createdAt.getTime() + windowMs
      : Date.now() + windowMs;
    const retryAfterSeconds = Math.ceil((expiresAt - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Registra a tentativa
  await prisma.rateLimitAttempt.create({
    data: { key, ip, userAgent },
  });

  return { allowed: true };
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimitAttempt.deleteMany({ where: { key } });
}
