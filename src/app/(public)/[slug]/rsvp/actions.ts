"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSessionToken, setGuestCookie, signRecoveryToken } from "@/lib/auth/guest";
import { email } from "@/lib/email";
import { formatEventDate } from "@/lib/timezone";

const RsvpSchema = z.object({
  slug: z.string(),
  name: z.string().min(2, "Nome muito curto"),
  emailAddr: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  plusOnes: z.coerce.number().min(0).max(10).default(0),
  dietaryRestrictions: z.string().optional(),
  message: z.string().optional(),
  rsvpStatus: z.enum(["CONFIRMED", "DECLINED"]),
  consentTerms: z.literal("on", { message: "Você precisa aceitar os termos" }),
  consentPhotoMural: z.string().optional(),
});

export type RsvpActionResult =
  | { ok: true; status: "CONFIRMED" | "DECLINED"; guestName: string }
  | { ok: false; type: "RECOVERY_SENT"; emailAddr: string }
  | { ok: false; type: "ERROR"; message: string };

export async function submitRsvp(formData: FormData): Promise<RsvpActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = RsvpSchema.safeParse(raw);

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos";
    return { ok: false, type: "ERROR", message: first };
  }

  const {
    slug,
    name,
    emailAddr,
    phone,
    plusOnes,
    dietaryRestrictions,
    message,
    rsvpStatus,
    consentPhotoMural,
  } = parsed.data;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return { ok: false, type: "ERROR", message: "Evento não encontrado" };

  // Verifica se já existe Guest com esse email neste evento
  const existing = await prisma.guest.findUnique({
    where: { eventId_email: { eventId: event.id, email: emailAddr } },
  });

  if (existing) {
    if (!existing.deletedAt && !existing.banned) {
      // Envia magic link de reidentificação em vez de criar duplicado
      await sendRecoveryEmail(existing.sessionToken, emailAddr, event.title, slug);
      return { ok: false, type: "RECOVERY_SENT", emailAddr };
    }
  }

  const sessionToken = generateSessionToken();
  const isEarly =
    event.rsvpEarlyDeadline ? new Date() <= event.rsvpEarlyDeadline : false;

  const guest = existing
    ? await prisma.guest.update({
        where: { id: existing.id },
        data: {
          name,
          phone: phone || null,
          plusOnes,
          dietaryRestrictions: dietaryRestrictions || null,
          message: message || null,
          rsvpStatus,
          consentTerms: true,
          consentPhotoMural: consentPhotoMural === "on",
          consentTimestamp: new Date(),
          sessionToken,
          deletedAt: null,
        },
      })
    : await prisma.guest.create({
        data: {
          eventId: event.id,
          name,
          email: emailAddr,
          phone: phone || null,
          plusOnes,
          dietaryRestrictions: dietaryRestrictions || null,
          message: message || null,
          rsvpStatus,
          consentTerms: true,
          consentPhotoMural: consentPhotoMural === "on",
          consentTimestamp: new Date(),
          sessionToken,
        },
      });

  // Pontua rsvp_early se elegível (pontos implementados na Fase 4)
  // TODO[fase-4]: awaitpoints.award(guest.id, event.id, isEarly ? 'rsvp_early' : 'rsvp_late')
  void isEarly;

  await setGuestCookie(sessionToken);

  if (rsvpStatus === "CONFIRMED") {
    await sendConfirmationEmail(
      emailAddr,
      name,
      event.title,
      formatEventDate(event.ceremonyDate, event.timezone, "d 'de' MMMM 'de' yyyy 'às' HH:mm"),
      event.ceremonyLocation ?? "",
      slug
    );
  }

  return { ok: true, status: rsvpStatus, guestName: guest.name };
}

// ─── Envio de email de recuperação ────────────────────────────────────────

async function sendRecoveryEmail(
  sessionToken: string,
  to: string,
  eventTitle: string,
  slug: string
) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const token = signRecoveryToken(sessionToken, expiresAt);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/${slug}/recuperar?t=${token}`;

  await email.send({
    to,
    subject: `Seu acesso ao ${eventTitle}`,
    idempotencyKey: `recovery-${sessionToken}`,
    html: `
      <p>Olá!</p>
      <p>Você já está na nossa lista para <strong>${eventTitle}</strong>.</p>
      <p>Clique no link abaixo para acessar seu convite:</p>
      <p><a href="${link}" style="font-size:18px;font-weight:bold">Acessar meu convite</a></p>
      <p><small>Este link expira em 24 horas.</small></p>
    `,
    text: `Seu link de acesso para ${eventTitle}: ${link}`,
  });
}

// ─── Email de confirmação de presença ─────────────────────────────────────

async function sendConfirmationEmail(
  to: string,
  name: string,
  eventTitle: string,
  dateLabel: string,
  location: string,
  slug: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/${slug}`;

  await email.send({
    to,
    subject: `Presença confirmada — ${eventTitle}`,
    idempotencyKey: `rsvp-confirm-${to}-${slug}`,
    html: `
      <p>Olá, ${name}!</p>
      <p>Sua presença em <strong>${eventTitle}</strong> foi confirmada com sucesso. 🎉</p>
      ${dateLabel ? `<p>📅 ${dateLabel}</p>` : ""}
      ${location ? `<p>📍 ${location}</p>` : ""}
      <p><a href="${eventUrl}">Ver meu convite</a></p>
    `,
    text: `Presença confirmada em ${eventTitle}! ${dateLabel}. Acesse: ${eventUrl}`,
  });
}
