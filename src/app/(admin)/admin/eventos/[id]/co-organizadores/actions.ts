"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authorization";
import { email } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { signClaimToken } from "@/lib/auth/co-org-token";

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
    select: { coupleNames: true },
  });
  if (!event) return;

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
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
