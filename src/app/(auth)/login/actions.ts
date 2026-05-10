"use server";

import { getAppUrl } from "@/lib/app-url";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions";
import { hashPassword } from "@/lib/auth/password";
import { validateEmail } from "@/lib/auth/validate-email";
import { validatePassword } from "@/lib/auth/validate-password";
import { checkRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { logAuthEvent } from "@/lib/auth/auth-log";
import { email as emailProvider } from "@/lib/email";
import {
  welcomeVerifyHtml,
  welcomeVerifyText,
  magicLinkLoginHtml,
  magicLinkLoginText,
} from "@/lib/email/templates";
import { verifyTurnstile } from "@/lib/auth/turnstile";

export type AuthState = { error: string; field?: string } | null;

async function getRequestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const userAgent = h.get("user-agent") ?? undefined;
  return { ip, userAgent };
}

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  website: z.string().max(0), // honeypot
});

export async function loginAction(formData: FormData): Promise<AuthState> {
  const { ip, userAgent } = await getRequestMeta();

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    website: (formData.get("website") as string) ?? "",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const hasHoneypot = parsed.error.issues.some((i) => i.path[0] === "website");
    if (hasHoneypot) return null; // bot — silently ignore
    return { error: "Preencha e-mail e senha.", field: "email" };
  }

  const { email, password } = parsed.data;

  const cfToken = (formData.get("cf-turnstile-response") as string) ?? "";
  if (!await verifyTurnstile(cfToken)) {
    await logAuthEvent({ action: "CAPTCHA_FAILED", ip, userAgent, email });
    return { error: "Verificação de segurança falhou. Recarregue a página e tente novamente." };
  }

  const rl = await checkRateLimit(`login:${email}:${ip}`, ip, 5, 15, userAgent);
  if (!rl.allowed) {
    return {
      error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.retryAfterSeconds / 60)} min.`,
    };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      await logAuthEvent({ action: "LOGIN_FAILED", ip, userAgent, email });
      if (error.type === "CredentialsSignin") {
        return { error: "E-mail ou senha incorretos.", field: "password" };
      }
      return { error: "Erro de autenticação. Tente novamente." };
    }
    // NEXT_REDIRECT — deixa o runtime do Next.js processar
    await clearRateLimit(`login:${email}:${ip}`);
    await logAuthEvent({ action: "LOGIN_SUCCESS", ip, userAgent, email });
    throw error;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signup
// ─────────────────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.email(),
  password: z.string().min(8),
  termsAccepted: z.literal("true", { message: "Aceite os Termos de Uso." }),
  privacyAccepted: z.literal("true", { message: "Aceite a Política de Privacidade." }),
  website: z.string().max(0), // honeypot
});

export async function signupAction(formData: FormData): Promise<AuthState> {
  const { ip, userAgent } = await getRequestMeta();

  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    termsAccepted: formData.get("termsAccepted"),
    privacyAccepted: formData.get("privacyAccepted"),
    website: (formData.get("website") as string) ?? "",
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const hasHoneypot = parsed.error.issues.some((i) => i.path[0] === "website");
    if (hasHoneypot) return null;
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path[0] as string | undefined;
    const msg =
      field === "termsAccepted" ? "Aceite os Termos de Uso para continuar."
      : field === "privacyAccepted" ? "Aceite a Política de Privacidade para continuar."
      : "Preencha todos os campos corretamente.";
    return { error: msg, field };
  }

  const { firstName, lastName, email, password } = parsed.data;

  const cfToken = (formData.get("cf-turnstile-response") as string) ?? "";
  if (!await verifyTurnstile(cfToken)) {
    await logAuthEvent({ action: "CAPTCHA_FAILED", ip, userAgent, email });
    return { error: "Verificação de segurança falhou. Recarregue a página e tente novamente." };
  }

  const emailResult = validateEmail(email);
  if (!emailResult.ok) {
    const msg =
      emailResult.reason === "disposable"
        ? "Use um e-mail permanente, não temporário."
        : emailResult.reason === "too_long"
          ? "E-mail muito longo."
          : "E-mail inválido.";
    return { error: msg, field: "email" };
  }

  const pwResult = validatePassword(password);
  if (!pwResult.ok) {
    const msg =
      pwResult.reason === "too_short"
        ? "Mínimo 8 caracteres."
        : pwResult.reason === "no_letter"
          ? "Inclua pelo menos uma letra."
          : pwResult.reason === "no_number"
            ? "Inclua pelo menos um número."
            : "Senha muito fraca. Adicione mais variedade.";
    return { error: msg, field: "password" };
  }

  const rl = await checkRateLimit(`signup:${ip}`, ip, 3, 60, userAgent);
  if (!rl.allowed) {
    return {
      error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.retryAfterSeconds / 60)} min.`,
    };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "E-mail já cadastrado. Tente entrar ou recuperar a senha.", field: "email" };
  }

  const now = new Date();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      passwordHash,
      profileCompleted: false,
      onboardingCompleted: false,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
    },
  });

  await logAuthEvent({ action: "SIGNUP_COMPLETED", ip, userAgent, email });

  // Generate verification token and send welcome email (best-effort, non-blocking)
  try {
    const BASE_URL = getAppUrl();
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.verificationToken.create({ data: { identifier: email, token, expires } });
    // MEL-3: link aponta pro fluxo magic-link, que valida o token, marca
    // emailVerified, cria sessão e redireciona — tudo num clique. Não há
    // mais o passo "agora faça login com sua senha" depois da verificação.
    const verifyUrl = `${BASE_URL}/auth/magic?token=${token}`;
    await emailProvider.send({
      to: email,
      subject: "Confirme seu e-mail — Voem.",
      html: welcomeVerifyHtml({ name: user.firstName || firstName, verifyUrl }),
      text: welcomeVerifyText({ name: user.firstName || firstName, verifyUrl }),
      idempotencyKey: `welcome-${user.id}`,
    });
  } catch (emailError) {
    const reason = emailError instanceof Error ? emailError.message : String(emailError);
    const border = "═".repeat(64);
    console.error(`\n${border}`);
    console.error("🚨  [EMAIL FALHOU] Bem-vindo / verificação não enviado");
    console.error(border);
    console.error(`Para:   ${email}`);
    console.error(`Motivo: ${reason}`);
    console.error("Dica:   Verifique RESEND_API_KEY e se o domínio está verificado no Resend.");
    console.error(`${border}\n`);
    await logAuthEvent({
      action: "EMAIL_SEND_FAILED",
      ip,
      userAgent,
      email,
      metadata: { type: "welcome_verify", reason },
    });
  }

  // Nenhum cookie setado aqui. Sessão só é criada após o usuário verificar o email e fazer login.
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

// ─── Magic link (login sem senha) ───────────────────────────────────────────────

export type MagicLinkState = { ok: true } | { error: string } | null;

export async function requestMagicLinkAction(formData: FormData): Promise<MagicLinkState> {
  const { ip, userAgent } = await getRequestMeta();
  const rawEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!rawEmail || !rawEmail.includes("@")) {
    return { error: "Informe um e-mail válido." };
  }

  const rl = await checkRateLimit(`magic-link:${ip}`, ip, 3, 60, userAgent);
  if (!rl.allowed) {
    return {
      error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.retryAfterSeconds / 60)} min.`,
    };
  }

  // Anti-enumeration: sempre responde "ok", mesmo se o e-mail não existir.
  // Só envia email de fato se o usuário existir.
  const user = await prisma.user.findUnique({
    where: { email: rawEmail },
    select: { id: true, firstName: true },
  });

  if (user) {
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.verificationToken.create({
      data: { identifier: rawEmail, token, expires },
    });
    const link = `${getAppUrl()}/auth/magic?token=${token}`;
    try {
      await emailProvider.send({
        to: rawEmail,
        subject: "Acessar sua conta no Voem.",
        html: magicLinkLoginHtml({ email: rawEmail, url: link }),
        text: magicLinkLoginText({ email: rawEmail, url: link }),
        idempotencyKey: `magic-${user.id}-${token.slice(0, 8)}`,
      });
    } catch (emailError) {
      const reason = emailError instanceof Error ? emailError.message : String(emailError);
      console.error("[magic-link] email send failed:", reason);
      await logAuthEvent({
        action: "EMAIL_SEND_FAILED",
        ip,
        userAgent,
        email: rawEmail,
        metadata: { type: "magic_link", reason },
      });
    }
  }

  return { ok: true };
}
