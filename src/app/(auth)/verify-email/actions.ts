"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { email as emailProvider } from "@/lib/email";
import { welcomeVerifyHtml, welcomeVerifyText } from "@/lib/email/templates";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function resendVerificationEmail(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Não autenticado." };

  const { email: userEmail, name } = session.user;

  // Delete existing tokens for this identifier to avoid accumulation
  await prisma.verificationToken.deleteMany({ where: { identifier: userEmail } });

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({ data: { identifier: userEmail, token, expires } });

  const verifyUrl = `${BASE_URL}/api/auth/verify?token=${token}`;
  const firstName = name?.split(" ")[0] ?? name ?? "você";

  try {
    await emailProvider.send({
      to: userEmail,
      subject: "Confirme seu e-mail — Voem.",
      html: welcomeVerifyHtml({ name: firstName, verifyUrl }),
      text: welcomeVerifyText({ name: firstName, verifyUrl }),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Falha ao enviar e-mail. Tente novamente." };
  }
}
