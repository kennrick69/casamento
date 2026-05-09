"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getPasswordScore } from "@/lib/auth/validate-password";
import { logAuthEvent } from "@/lib/auth/auth-log";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session;
}

async function getIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

// ── Dados pessoais ─────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  phone: z.string().max(20).optional(),
});

export type AccountState = { ok: boolean; error?: string } | null;

export async function updateProfile(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession().catch(() => null);
  if (!session) return { ok: false, error: "Não autenticado." };

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: (formData.get("phone") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Preencha os campos obrigatórios." };

  const { firstName, lastName, phone } = parsed.data;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { firstName, lastName, name: `${firstName} ${lastName}`, phone: phone ?? null },
  });

  revalidatePath("/admin/conta");
  return { ok: true };
}

// ── Alterar senha ──────────────────────────────────────────────────────────

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
});

export async function updatePassword(formData: FormData): Promise<AccountState> {
  const session = await requireSession().catch(() => null);
  if (!session) return { ok: false, error: "Não autenticado." };

  const ip = await getIp();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, error: "Preencha todos os campos." };

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Senhas não conferem." };
  }

  if (getPasswordScore(newPassword) < 2) {
    return { ok: false, error: "Nova senha muito fraca." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, email: true, firstName: true },
  });

  if (!user?.passwordHash) {
    return { ok: false, error: "Conta sem senha definida. Use o link de redefinição." };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, passwordChangedAt: now },
  });

  await logAuthEvent({ action: "PASSWORD_CHANGED", ip, email: user.email });

  // Re-autentica para criar JWT com iat > passwordChangedAt (evita auto-logout)
  try {
    await signIn("credentials", { email: user.email, password: newPassword, redirectTo: "/admin/conta?changed=1" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Senha alterada, mas não foi possível re-autenticar. Faça login novamente." };
    }
    throw error; // NEXT_REDIRECT
  }

  return null;
}

// ── Notificações ───────────────────────────────────────────────────────────

export async function updateNotifications(formData: FormData): Promise<{ ok: boolean }> {
  const session = await requireSession().catch(() => null);
  if (!session) return { ok: false };

  const marketingOptIn = formData.get("marketingOptIn") === "on";
  await prisma.user.update({
    where: { id: session.user.id },
    data: { marketingOptIn },
  });

  revalidatePath("/admin/conta");
  return { ok: true };
}

// ── Exclusão de conta (LGPD art. 18) ──────────────────────────────────────

const deleteAccountSchema = z.object({ confirmation: z.literal("excluir minha conta") });

export async function deleteAccount(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession().catch(() => null);
  if (!session) return { ok: false, error: "Não autenticado." };

  const parsed = deleteAccountSchema.safeParse({ confirmation: formData.get("confirmation") });
  if (!parsed.success) return { ok: false, error: 'Digite exatamente "excluir minha conta" para confirmar.' };

  const ip = await getIp();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  await prisma.$transaction([
    prisma.eventOrganizer.deleteMany({ where: { userId } }),
    prisma.authLog.deleteMany({ where: { userId } }),
    prisma.passwordReset.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  await logAuthEvent({ action: "ACCOUNT_DELETED", ip, email: user?.email ?? "" });

  await signOut({ redirectTo: "/" });
  return { ok: true };
}
