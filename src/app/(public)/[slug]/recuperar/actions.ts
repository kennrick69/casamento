"use server";

import { getAppUrl } from "@/lib/app-url";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { signRecoveryToken } from "@/lib/auth/guest";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { email } from "@/lib/email";
import { recoveryHtml, recoveryText } from "@/lib/email/templates";

const Schema = z.object({
  slug: z.string(),
  emailAddr: z.string().email("E-mail inválido"),
});

export type RecoverResult =
  | { ok: true }
  | { ok: false; message: string };

export async function requestRecoveryLink(formData: FormData): Promise<RecoverResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`recovery:${ip}`, ip, 5, 60);
  if (!rl.allowed) {
    return { ok: true }; // Anti-enumeration: não revelar que foi bloqueado
  }

  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { slug, emailAddr } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, title: true, coupleNames: true },
  });
  if (!event) return { ok: false, message: "Evento não encontrado" };

  // Resposta idêntica independente de o email existir — evita enumeração
  const guest = await prisma.guest.findUnique({
    where: { eventId_email: { eventId: event.id, email: emailAddr } },
  });

  if (guest && !guest.banned && !guest.deletedAt) {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const token = signRecoveryToken(guest.sessionToken, expiresAt);
    const baseUrl = getAppUrl();
    const link = `${baseUrl}/${slug}/recuperar?t=${token}`;

    await email.send({
      to: emailAddr,
      subject: `Seu acesso — ${event.title}`,
      idempotencyKey: `recovery-${guest.sessionToken}-${Math.floor(Date.now() / 3_600_000)}`,
      html: recoveryHtml({ eventTitle: event.title, coupleNames: event.coupleNames, link }),
      text: recoveryText({ eventTitle: event.title, coupleNames: event.coupleNames, link }),
    });
  }

  return { ok: true };
}
