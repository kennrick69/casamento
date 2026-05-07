"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSessionToken, setGuestCookie, signRecoveryToken } from "@/lib/auth/guest";
import { awardPoints } from "@/lib/points";
import { email } from "@/lib/email";
import { formatEventDate } from "@/lib/timezone";
import {
  rsvpConfirmHtml,
  rsvpConfirmText,
  rsvpDeclineHtml,
  rsvpDeclineText,
  recoveryHtml,
  recoveryText,
} from "@/lib/email/templates";

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

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      coupleNames: true,
      ceremonyDate: true,
      ceremonyLocation: true,
      timezone: true,
      rsvpEarlyDeadline: true,
    },
  });
  if (!event) return { ok: false, type: "ERROR", message: "Evento não encontrado" };

  // Verifica se já existe Guest com esse email neste evento
  const existing = await prisma.guest.findUnique({
    where: { eventId_email: { eventId: event.id, email: emailAddr } },
  });

  if (existing) {
    if (!existing.deletedAt && !existing.banned) {
      await sendRecoveryEmail(existing.sessionToken, emailAddr, event.title, event.coupleNames, slug);
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

  if (rsvpStatus === "CONFIRMED") {
    void awardPoints(guest.id, event.id, "rsvp_confirmed");
    if (isEarly) void awardPoints(guest.id, event.id, "rsvp_early");
  }

  await setGuestCookie(sessionToken);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/${slug}`;
  const dateLabel = formatEventDate(
    event.ceremonyDate,
    event.timezone,
    "d 'de' MMMM 'de' yyyy 'às' HH:mm"
  );

  if (rsvpStatus === "CONFIRMED") {
    await email.send({
      to: emailAddr,
      subject: `Presença confirmada — ${event.title}`,
      idempotencyKey: `rsvp-confirm-${emailAddr}-${slug}`,
      html: rsvpConfirmHtml({
        name,
        eventTitle: event.title,
        coupleNames: event.coupleNames,
        dateLabel,
        location: event.ceremonyLocation ?? "",
        eventUrl,
      }),
      text: rsvpConfirmText({
        name,
        eventTitle: event.title,
        coupleNames: event.coupleNames,
        dateLabel,
        location: event.ceremonyLocation ?? "",
        eventUrl,
      }),
    });
  } else {
    await email.send({
      to: emailAddr,
      subject: `Recebemos sua resposta — ${event.title}`,
      idempotencyKey: `rsvp-decline-${emailAddr}-${slug}`,
      html: rsvpDeclineHtml({
        name,
        eventTitle: event.title,
        coupleNames: event.coupleNames,
        eventUrl,
      }),
      text: rsvpDeclineText({
        name,
        eventTitle: event.title,
        coupleNames: event.coupleNames,
        eventUrl,
      }),
    });
  }

  return { ok: true, status: rsvpStatus, guestName: guest.name };
}

// ─── Envio de email de recuperação ────────────────────────────────────────

async function sendRecoveryEmail(
  sessionToken: string,
  to: string,
  eventTitle: string,
  coupleNames: string,
  slug: string
) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const token = signRecoveryToken(sessionToken, expiresAt);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/${slug}/recuperar?t=${token}`;

  await email.send({
    to,
    subject: `Seu acesso — ${eventTitle}`,
    idempotencyKey: `recovery-${sessionToken}`,
    html: recoveryHtml({ eventTitle, coupleNames, link }),
    text: recoveryText({ eventTitle, coupleNames, link }),
  });
}
