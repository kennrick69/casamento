"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { validateEmail } from "@/lib/auth/validate-email";
import { validatePassword } from "@/lib/auth/validate-password";
import { checkRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { logAuthEvent } from "@/lib/auth/auth-log";

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
  website: z.string().max(0), // honeypot
});

export async function signupAction(formData: FormData): Promise<AuthState> {
  const { ip, userAgent } = await getRequestMeta();

  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    website: (formData.get("website") as string) ?? "",
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const hasHoneypot = parsed.error.issues.some((i) => i.path[0] === "website");
    if (hasHoneypot) return null;
    const firstField = parsed.error.issues[0]?.path[0] as string | undefined;
    return { error: "Preencha todos os campos corretamente.", field: firstField };
  }

  const { firstName, lastName, email, password } = parsed.data;

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

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      passwordHash,
      profileCompleted: false,
      onboardingCompleted: false,
    },
  });

  await logAuthEvent({ action: "SIGNUP_COMPLETED", ip, userAgent, email });

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Conta criada. Faça login para entrar.", field: undefined };
    }
    throw error; // NEXT_REDIRECT
  }
  return null;
}
