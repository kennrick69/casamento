"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { email } from "@/lib/email";
import { ensurePersonalCodes, markInviteSent } from "@/lib/invite/codes";
import { buildInviteContext } from "@/lib/invite/context";
import { buildInviteText, buildInviteEmailHtml } from "@/lib/invite/message";

type Result = { ok: true } | { ok: false; message: string };

const EVENT_SELECT = {
  id: true,
  slug: true,
  coupleNames: true,
  ceremonyDate: true,
  timezone: true,
  ceremonyLocation: true,
  ceremonyAddress: true,
  mapsLink: true,
} as const;

// Garante o código pessoal de um convidado específico (idempotente). O
// ensurePersonalCodes cuida de todo o evento; aqui só retornamos o do convidado.
async function codeForGuest(eventId: string, guestId: string): Promise<string | null> {
  const codes = await ensurePersonalCodes(eventId);
  return codes.get(guestId) ?? null;
}

// Marca que o convite foi disparado pelo WhatsApp (o link wa.me é aberto no
// cliente; aqui só registramos o marcador de enviado).
export async function markWhatsappSent(eventId: string, guestId: string): Promise<Result> {
  await requireOrganizer(eventId);
  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId, deletedAt: null },
    select: { id: true },
  });
  if (!guest) return { ok: false, message: "Convidado não encontrado." };

  const code = await prisma.inviteCode.findFirst({
    where: { eventId, guestId, kind: "PERSONAL" },
    select: { id: true },
  });
  if (!code) return { ok: false, message: "Código do convidado não encontrado." };

  await markInviteSent(code.id, "whatsapp");
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
  return { ok: true };
}

// Envia o convite por e-mail PELO SISTEMA do site e marca como enviado.
export async function sendInviteEmail(eventId: string, guestId: string): Promise<Result> {
  await requireOrganizer(eventId);

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: EVENT_SELECT });
  if (!event) return { ok: false, message: "Evento não encontrado." };

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId, deletedAt: null, isVisitor: false },
    select: { id: true, name: true, email: true },
  });
  if (!guest) return { ok: false, message: "Convidado não encontrado." };
  if (!guest.email || guest.email.endsWith(".invalid")) {
    return { ok: false, message: "Convidado sem e-mail válido." };
  }

  const code = await codeForGuest(eventId, guestId);
  if (!code) return { ok: false, message: "Não foi possível gerar o código do convidado." };

  const ctx = await buildInviteContext(event, guest.name, code);

  try {
    await email.send({
      to: guest.email,
      subject: `Convite para o casamento de ${event.coupleNames}`,
      html: buildInviteEmailHtml(ctx),
      text: buildInviteText(ctx),
      idempotencyKey: `invite:${code}`,
    });
  } catch {
    return { ok: false, message: "Falha ao enviar o e-mail. Tente de novo." };
  }

  const codeRow = await prisma.inviteCode.findFirst({
    where: { eventId, guestId, kind: "PERSONAL" },
    select: { id: true },
  });
  if (codeRow) await markInviteSent(codeRow.id, "email");
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
  return { ok: true };
}
