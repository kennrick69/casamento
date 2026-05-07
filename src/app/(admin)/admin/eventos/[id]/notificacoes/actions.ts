"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { email } from "@/lib/email";
import { massEmailHtml, massEmailText } from "@/lib/email/templates";
import { z } from "zod";

const Schema = z.object({
  eventId: z.string(),
  subject: z.string().min(3).max(120),
  body: z.string().min(10).max(2000),
  audience: z.enum(["confirmed", "all"]),
});

export interface SendResult {
  ok: boolean;
  sent?: number;
  error?: string;
}

export async function sendMassEmail(formData: FormData): Promise<SendResult> {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const { eventId, subject, body, audience } = parsed.data;

  try { await requireOrganizer(eventId); } catch {
    return { ok: false, error: "Sem permissão." };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { slug: true, title: true, coupleNames: true },
  });
  if (!event) return { ok: false, error: "Evento não encontrado." };

  const guests = await prisma.guest.findMany({
    where: {
      eventId,
      deletedAt: null,
      banned: false,
      ...(audience === "confirmed" ? { rsvpStatus: "CONFIRMED" } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/${event.slug}`;
  let sent = 0;

  for (const guest of guests) {
    if (!guest.email) continue;
    await email
      .send({
        to: guest.email,
        subject,
        idempotencyKey: `mass-${eventId}-${guest.id}-${Buffer.from(subject).toString("base64").slice(0, 12)}`,
        html: massEmailHtml({ name: guest.name, eventTitle: event.title, coupleNames: event.coupleNames, subject, body, eventUrl }),
        text: massEmailText({ name: guest.name, eventTitle: event.title, coupleNames: event.coupleNames, subject, body, eventUrl }),
      })
      .catch(() => null);
    sent++;
  }

  return { ok: true, sent };
}
