"use server";

import { getAppUrl } from "@/lib/app-url";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { generateSessionToken, setGuestCookie, signRecoveryToken } from "@/lib/auth/guest";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { awardPoints } from "@/lib/points";
import { getMainLocation } from "@/lib/locations";
import { email } from "@/lib/email";
import { formatEventDate } from "@/lib/timezone";
import {
  rsvpConfirmationHtml,
  rsvpConfirmationText,
  rsvpDeclineHtml,
  rsvpDeclineText,
  recoveryHtml,
  recoveryText,
} from "@/lib/email/templates";

const CompanionSchema = z.object({
  name: z.string().min(1, "Nome do acompanhante é obrigatório").max(80),
  type: z.enum(["ADULT", "CHILD"]),
});

const RsvpSchema = z.object({
  slug: z.string(),
  name: z.string().min(2, "Nome muito curto"),
  emailAddr: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  message: z.string().optional(),
  rsvpStatus: z.enum(["CONFIRMED", "DECLINED"]),
  consentTerms: z.literal("on", { message: "Você precisa aceitar os termos" }),
  consentPhotoMural: z.string().optional(),
  profilePublic: z.string().optional(),
  companionsJson: z.string().optional(),
});

export type RsvpActionResult =
  | { ok: true; status: "CONFIRMED" | "DECLINED"; guestName: string }
  | { ok: false; type: "RECOVERY_SENT"; emailAddr: string }
  | { ok: false; type: "ERROR"; message: string };

export async function submitRsvp(formData: FormData): Promise<RsvpActionResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`rsvp:${ip}`, ip, 5, 60);
  if (!rl.allowed) {
    return { ok: false, type: "ERROR", message: `Muitas tentativas. Aguarde ${Math.ceil(rl.retryAfterSeconds / 60)} minuto(s).` };
  }

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
    dietaryRestrictions,
    message,
    rsvpStatus,
    consentPhotoMural,
    profilePublic,
    companionsJson,
  } = parsed.data;

  // Parse companions: lista vazia se DECLINED ou se vier inválido. plusOnes
  // continua como contagem denormalizada (várias views ainda usam) — fica
  // sempre em sync com companions.length.
  let companions: { name: string; type: "ADULT" | "CHILD" }[] = [];
  if (rsvpStatus === "CONFIRMED" && companionsJson) {
    try {
      const raw = JSON.parse(companionsJson);
      if (Array.isArray(raw)) {
        const parsedCompanions = z
          .array(CompanionSchema)
          .max(10, "Máximo 10 acompanhantes")
          .safeParse(raw);
        if (!parsedCompanions.success) {
          const first = parsedCompanions.error.issues[0]?.message ?? "Acompanhante inválido";
          return { ok: false, type: "ERROR", message: first };
        }
        companions = parsedCompanions.data;
      }
    } catch {
      return { ok: false, type: "ERROR", message: "Formato de acompanhantes inválido" };
    }
  }
  const plusOnes = companions.length;

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

  const [mainLocation, receptionLocation] = await Promise.all([
    getMainLocation(event.id, "CEREMONY"),
    getMainLocation(event.id, "RECEPTION"),
  ]);

  function locationLabel(
    loc: Awaited<ReturnType<typeof getMainLocation>>,
    legacyName: string | null
  ) {
    if (loc?.title) return `${loc.title}${loc.address ? ` — ${loc.address}` : ""}`;
    return legacyName ?? "";
  }

  const ceremonyLabel = locationLabel(mainLocation, event.ceremonyLocation);
  const receptionLabel = locationLabel(receptionLocation, null);

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

  // Upsert guest + reset companion list em uma transação. Sempre apaga e
  // recria os companions pra evitar drift entre form e DB; lista é curta
  // (max 10) então o custo é desprezível.
  const guest = await prisma.$transaction(async (tx) => {
    const upserted = existing
      ? await tx.guest.update({
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
            profilePublic: profilePublic === "on",
            consentTimestamp: new Date(),
            sessionToken,
            deletedAt: null,
          },
        })
      : await tx.guest.create({
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
            profilePublic: profilePublic === "on",
            consentTimestamp: new Date(),
            sessionToken,
          },
        });

    await tx.guestCompanion.deleteMany({ where: { guestId: upserted.id } });
    if (companions.length > 0) {
      await tx.guestCompanion.createMany({
        data: companions.map((c) => ({
          guestId: upserted.id,
          name: c.name,
          type: c.type,
        })),
      });
    }
    return upserted;
  });

  if (rsvpStatus === "CONFIRMED") {
    void awardPoints(guest.id, event.id, "rsvp_confirmed");
    if (isEarly) void awardPoints(guest.id, event.id, "rsvp_early");
  }

  await setGuestCookie(sessionToken);

  const appUrl = getAppUrl();
  const eventUrl = `${appUrl}/${slug}`;
  const dateLabel = formatEventDate(
    event.ceremonyDate,
    event.timezone,
    "d 'de' MMMM 'de' yyyy 'às' HH:mm"
  );

  const antiSpamHeaders = {
    "Precedence": "transactional",
    "X-Entity-Ref-ID": `rsvp-confirm-${slug}`,
  };

  if (rsvpStatus === "CONFIRMED") {
    await email.send({
      to: emailAddr,
      subject: `Presença confirmada — ${event.title}`,
      idempotencyKey: `rsvp-confirm-${emailAddr}-${slug}`,
      headers: antiSpamHeaders,
      html: rsvpConfirmationHtml({
        name,
        coupleNames: event.coupleNames,
        eventTitle: event.title,
        dateLabel,
        ceremonyLabel: ceremonyLabel || undefined,
        receptionLabel: receptionLabel || undefined,
        eventUrl,
        editResponseUrl: `${appUrl}/${slug}/rsvp`,
        muralUrl: `${appUrl}/${slug}/mural`,
      }),
      text: rsvpConfirmationText({
        name,
        coupleNames: event.coupleNames,
        eventTitle: event.title,
        dateLabel,
        ceremonyLabel: ceremonyLabel || undefined,
        receptionLabel: receptionLabel || undefined,
        eventUrl,
        editResponseUrl: `${appUrl}/${slug}/rsvp`,
        muralUrl: `${appUrl}/${slug}/mural`,
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
  const baseUrl = getAppUrl();
  const link = `${baseUrl}/${slug}/recuperar?t=${token}`;

  await email.send({
    to,
    subject: `Seu acesso — ${eventTitle}`,
    idempotencyKey: `recovery-${sessionToken}`,
    html: recoveryHtml({ eventTitle, coupleNames, link }),
    text: recoveryText({ eventTitle, coupleNames, link }),
  });
}
