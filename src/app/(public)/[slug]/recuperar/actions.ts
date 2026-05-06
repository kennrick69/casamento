"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { signRecoveryToken } from "@/lib/auth/guest";
import { email } from "@/lib/email";

const Schema = z.object({
  slug: z.string(),
  emailAddr: z.string().email("E-mail inválido"),
});

export type RecoverResult =
  | { ok: true }
  | { ok: false; message: string };

export async function requestRecoveryLink(formData: FormData): Promise<RecoverResult> {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { slug, emailAddr } = parsed.data;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return { ok: false, message: "Evento não encontrado" };

  // Resposta idêntica independente de o email existir — evita enumeração
  const guest = await prisma.guest.findUnique({
    where: { eventId_email: { eventId: event.id, email: emailAddr } },
  });

  if (guest && !guest.banned && !guest.deletedAt) {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const token = signRecoveryToken(guest.sessionToken, expiresAt);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const link = `${baseUrl}/${slug}/recuperar?t=${token}`;

    await email.send({
      to: emailAddr,
      subject: `Seu acesso ao ${event.title}`,
      idempotencyKey: `recovery-${guest.sessionToken}-${Math.floor(Date.now() / 3_600_000)}`,
      html: `
        <p>Olá, ${guest.name}!</p>
        <p>Clique no link abaixo para acessar seu convite para <strong>${event.title}</strong>:</p>
        <p><a href="${link}" style="font-size:18px;font-weight:bold">Acessar meu convite</a></p>
        <p><small>Este link expira em 24 horas.</small></p>
      `,
      text: `Acesse seu convite para ${event.title}: ${link}`,
    });
  }

  return { ok: true };
}
