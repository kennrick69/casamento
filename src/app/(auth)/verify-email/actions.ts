"use server";

import { getAppUrl } from "@/lib/app-url";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { email as emailProvider } from "@/lib/email";
import { welcomeVerifyHtml, welcomeVerifyText } from "@/lib/email/templates";
import { logAuthEvent } from "@/lib/auth/auth-log";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function resendVerificationEmail(
  emailParam?: string,
): Promise<{ ok: boolean; error?: string }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const userAgent = h.get("user-agent") ?? undefined;

  // Aceita email de sessão (usuário já logado) ou de parâmetro (novo cadastro sem sessão)
  const session = await auth();
  const userEmail = emailParam ?? session?.user?.email;
  if (!userEmail) return { ok: false, error: "Informe o e-mail." };

  // Rate limit por IP para evitar abuso
  const rl = await checkRateLimit(`resend-verify:${ip}`, ip, 3, 15, userAgent);
  if (!rl.allowed) {
    return { ok: false, error: `Aguarde ${Math.ceil(rl.retryAfterSeconds / 60)} min para reenviar.` };
  }

  // Garante que o email está cadastrado e ainda não verificado
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, firstName: true, name: true, emailVerified: true },
  });
  if (!user) return { ok: false, error: "E-mail não encontrado." };
  if (user.emailVerified) return { ok: false, error: "E-mail já verificado. Faça login." };

  await prisma.verificationToken.deleteMany({ where: { identifier: userEmail } });

  const BASE_URL = getAppUrl();
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({ data: { identifier: userEmail, token, expires } });

  // MEL-3: link aponta pro fluxo magic-link (auto-login). Mesma URL usada
  // pelo signupAction.
  const verifyUrl = `${BASE_URL}/auth/magic?token=${token}`;
  const firstName = user.firstName ?? user.name?.split(" ")[0] ?? "você";

  try {
    await emailProvider.send({
      to: userEmail,
      subject: "Confirme seu e-mail — Voem.",
      html: welcomeVerifyHtml({ name: firstName, verifyUrl }),
      text: welcomeVerifyText({ name: firstName, verifyUrl }),
    });
    return { ok: true };
  } catch (emailError) {
    const reason = emailError instanceof Error ? emailError.message : String(emailError);
    const border = "═".repeat(64);
    console.error(`\n${border}`);
    console.error("🚨  [EMAIL FALHOU] Reenvio de verificação não enviado");
    console.error(border);
    console.error(`Para:   ${userEmail}`);
    console.error(`Motivo: ${reason}`);
    console.error("Dica:   Verifique RESEND_API_KEY e domínio no Resend.");
    console.error(`${border}\n`);
    await logAuthEvent({
      action: "EMAIL_SEND_FAILED",
      ip,
      userAgent,
      email: userEmail,
      metadata: { type: "resend_verify", reason },
    });
    return { ok: false, error: "Falha ao enviar e-mail. Tente novamente." };
  }
}
