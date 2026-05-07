"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authorization";
import { email } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { createHmac } from "crypto";

const CLAIM_SECRET = process.env.NEXTAUTH_SECRET ?? "build-time-placeholder";

function signClaimToken(eventId: string, inviteeEmail: string, expiresAt: number): string {
  const payload = `${eventId}:${inviteeEmail}:${expiresAt}`;
  const sig = createHmac("sha256", CLAIM_SECRET).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ eventId, inviteeEmail, expiresAt, sig })).toString(
    "base64url"
  );
}

export function verifyClaimToken(
  token: string
): { eventId: string; inviteeEmail: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString());
    const { eventId, inviteeEmail, expiresAt, sig } = parsed;
    if (Date.now() > expiresAt) return null;
    const expected = createHmac("sha256", CLAIM_SECRET)
      .update(`${eventId}:${inviteeEmail}:${expiresAt}`)
      .digest("hex");
    if (sig !== expected) return null;
    return { eventId, inviteeEmail };
  } catch {
    return null;
  }
}

export async function inviteCoOrganizer(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const schema = z.object({ eventId: z.string(), email: z.string().email() });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, email: inviteeEmail } = parsed.data;
  await requireOwner(eventId);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { coupleNames: true, title: true },
  });
  if (!event) return;

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 dias
  const token = signClaimToken(eventId, inviteeEmail, expiresAt);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/admin/co-organizador/claim?t=${token}`;

  await email.send({
    to: inviteeEmail,
    subject: `Convite para co-organizar ${event.coupleNames}`,
    idempotencyKey: `co-org-invite-${eventId}-${inviteeEmail}`,
    html: `
      <p>Olá!</p>
      <p>Você foi convidado para co-organizar o evento <strong>${event.coupleNames}</strong>.</p>
      <p><a href="${link}" style="font-size:16px;font-weight:bold">Aceitar convite</a></p>
      <p><small>Este link expira em 7 dias.</small></p>
    `,
    text: `Você foi convidado para co-organizar ${event.coupleNames}. Aceite em: ${link}`,
  });

  revalidatePath(`/admin/eventos/${eventId}/co-organizadores`);
}

export async function removeCoOrganizer(formData: FormData) {
  const schema = z.object({ eventId: z.string(), userId: z.string() });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, userId } = parsed.data;
  await requireOwner(eventId);

  await prisma.eventOrganizer.delete({
    where: { eventId_userId: { eventId, userId } },
  });

  revalidatePath(`/admin/eventos/${eventId}/co-organizadores`);
}
