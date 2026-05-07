import { prisma } from "@/lib/db";
import { Prisma, type AuthAction } from "@prisma/client";

interface LogAuthEventParams {
  action: AuthAction;
  ip: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuthEvent(params: LogAuthEventParams): Promise<void> {
  try {
    await prisma.authLog.create({
      data: {
        action: params.action,
        ip: params.ip,
        userAgent: params.userAgent,
        userId: params.userId,
        email: params.email,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Falha de log não deve bloquear o fluxo principal
    console.error("[auth-log] Falha ao registrar evento:", params.action);
  }
}
