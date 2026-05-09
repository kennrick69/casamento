"use server";

import { getAppUrl } from "@/lib/app-url";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logAuthEvent } from "@/lib/auth/auth-log";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { hashToken } from "@/lib/auth/token";
import { email as emailProvider } from "@/lib/email";
import { passwordResetHtml, passwordResetText } from "@/lib/email/templates";

const BASE_URL = getAppUrl();

const schema = z.object({
  email: z.email(),
  website: z.string().max(0), // honeypot
});

export type ForgotState = { error: string; field?: string } | null;

export async function requestPasswordReset(formData: FormData): Promise<ForgotState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const userAgent = h.get("user-agent") ?? undefined;

  const raw = {
    email: formData.get("email"),
    website: (formData.get("website") as string) ?? "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const hasHoneypot = parsed.error.issues.some((i) => i.path[0] === "website");
    if (hasHoneypot) return null; // bot — silently ignore
    return { error: "E-mail inválido.", field: "email" };
  }

  const { email } = parsed.data;

  const cfToken = (formData.get("cf-turnstile-response") as string) ?? "";
  if (!await verifyTurnstile(cfToken)) {
    await logAuthEvent({ action: "CAPTCHA_FAILED", ip, userAgent, email });
    return { error: "Verificação de segurança falhou. Recarregue a página." };
  }

  const rl = await checkRateLimit(`pwd-reset:${ip}`, ip, 3, 60, userAgent);
  if (!rl.allowed) {
    return { error: `Muitas tentativas. Aguarde ${Math.ceil(rl.retryAfterSeconds / 60)} min.` };
  }

  // Anti-enumeration: executa o trabalho mas retorna sempre a mesma mensagem
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true },
  });

  if (user) {
    // Invalida tokens ativos anteriores do mesmo usuário
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomUUID();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

    try {
      await emailProvider.send({
        to: email,
        subject: "Redefinir senha — Voem.",
        html: passwordResetHtml({ name: user.firstName || "você", resetUrl }),
        text: passwordResetText({ name: user.firstName || "você", resetUrl }),
      });
    } catch (emailError) {
      const reason = emailError instanceof Error ? emailError.message : String(emailError);
      const border = "═".repeat(64);
      console.error(`\n${border}`);
      console.error("🚨  [EMAIL FALHOU] Password reset não enviado");
      console.error(border);
      console.error(`Para:   ${email}`);
      console.error(`Link:   ${resetUrl}`);
      console.error(`Motivo: ${reason}`);
      console.error(`${border}\n`);
      await logAuthEvent({
        action: "EMAIL_SEND_FAILED",
        ip,
        userAgent,
        email,
        metadata: { type: "password_reset", reason },
      });
    }

    await logAuthEvent({ action: "PASSWORD_RESET_REQUESTED", ip, userAgent, email });
  }

  return null; // sempre retorna null (sucesso aparente — anti-enumeration)
}
