"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";
import { logAuthEvent } from "@/lib/auth/auth-log";
import { email as emailProvider } from "@/lib/email";
import { passwordChangedHtml, passwordChangedText } from "@/lib/email/templates";
import { getPasswordScore } from "@/lib/auth/validate-password";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(1),
});

export type ResetState = { error: string; field?: string } | null;

export async function resetPasswordAction(formData: FormData): Promise<ResetState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const userAgent = h.get("user-agent") ?? undefined;

  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return { error: "Dados inválidos." };

  const { token, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    return { error: "Senhas não conferem.", field: "confirmPassword" };
  }

  if (getPasswordScore(password) < 2) {
    return { error: "Senha muito fraca. Use letras, números e símbolos.", field: "password" };
  }

  const tokenHash = hashToken(token);
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { error: "Este link expirou ou já foi usado." };
  }

  const now = new Date();
  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash, passwordChangedAt: now },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: now },
    }),
  ]);

  await logAuthEvent({
    action: "PASSWORD_RESET_COMPLETED",
    ip,
    userAgent,
    email: reset.user.email,
  });

  // Notificação de segurança (best-effort)
  try {
    await emailProvider.send({
      to: reset.user.email,
      subject: "Sua senha foi alterada — Voem.",
      html: passwordChangedHtml({ name: reset.user.firstName || "você" }),
      text: passwordChangedText({ name: reset.user.firstName || "você" }),
    });
  } catch {
    // Não bloqueia o fluxo
  }

  // Cria sessão nova (passwordChangedAt > iat de tokens anteriores → force re-auth em outros devices)
  try {
    await signIn("credentials", { email: reset.user.email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Senha redefinida, mas não foi possível entrar automaticamente. Faça login." };
    }
    throw error; // NEXT_REDIRECT
  }

  return null;
}
