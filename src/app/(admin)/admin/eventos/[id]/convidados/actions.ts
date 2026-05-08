"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

async function authForEvent(eventId: string) {
  await requireOrganizer(eventId);
}

export async function toggleGuestBan(formData: FormData): Promise<{ ok: boolean; nowBanned: boolean }> {
  const guestId = formData.get("guestId") as string;
  const eventId = formData.get("eventId") as string;
  await authForEvent(eventId);

  const guest = await prisma.guest.findUnique({ where: { id: guestId }, select: { banned: true } });
  if (!guest) return { ok: false, nowBanned: false };

  await prisma.guest.update({ where: { id: guestId }, data: { banned: !guest.banned } });
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
  return { ok: true, nowBanned: !guest.banned };
}

export async function removeGuest(formData: FormData): Promise<{ ok: boolean }> {
  const guestId = formData.get("guestId") as string;
  const eventId = formData.get("eventId") as string;
  await authForEvent(eventId);

  await prisma.guest.update({
    where: { id: guestId },
    data: { deletedAt: new Date(), name: "Dados removidos", email: `removed_${guestId}@deleted.invalid` },
  });
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
  return { ok: true };
}

// ── Ações em massa ─────────────────────────────────────────────────────────────

export async function bulkBanGuests(formData: FormData): Promise<{ ok: boolean; count: number }> {
  const eventId = formData.get("eventId") as string;
  const ban = formData.get("ban") === "true";
  await authForEvent(eventId);

  const ids = formData.getAll("guestId") as string[];
  if (!ids.length) return { ok: false, count: 0 };

  await prisma.guest.updateMany({
    where: { id: { in: ids }, eventId },
    data: { banned: ban },
  });
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
  return { ok: true, count: ids.length };
}

export async function bulkRemoveGuests(formData: FormData): Promise<{ ok: boolean; count: number }> {
  const eventId = formData.get("eventId") as string;
  await authForEvent(eventId);

  const ids = formData.getAll("guestId") as string[];
  if (!ids.length) return { ok: false, count: 0 };

  await prisma.guest.updateMany({
    where: { id: { in: ids }, eventId },
    data: { deletedAt: new Date(), name: "Dados removidos" },
  });
  revalidatePath(`/admin/eventos/${eventId}/convidados`);
  return { ok: true, count: ids.length };
}

// ── Importação via CSV ─────────────────────────────────────────────────────────

export async function importGuestsFromCsv(
  formData: FormData
): Promise<{ ok: boolean; imported: number; skipped: number; errors: string[] }> {
  const eventId = formData.get("eventId") as string;
  await authForEvent(eventId);

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, imported: 0, skipped: 0, errors: ["Nenhum arquivo enviado."] };

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { ok: false, imported: 0, skipped: 0, errors: ["Arquivo vazio."] };

  // Detect header: skip if first cell looks like "name" or "nome"
  const firstCell = lines[0].split(",")[0].trim().toLowerCase().replace(/"/g, "");
  const startIdx = ["name", "nome", "email", "guest"].includes(firstCell) ? 1 : 0;
  const rows = lines.slice(startIdx);

  const existingEmails = new Set(
    (await prisma.guest.findMany({
      where: { eventId, deletedAt: null },
      select: { email: true },
    })).map((g) => g.email.toLowerCase())
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [name, email, phone, plusOnesRaw, dietary] = cols;

    if (!name || !email || !email.includes("@")) {
      errors.push(`Linha ${startIdx + i + 1}: nome ou e-mail inválido — ignorado.`);
      skipped++;
      continue;
    }
    if (existingEmails.has(email.toLowerCase())) {
      skipped++;
      continue;
    }

    const plusOnes = Math.min(parseInt(plusOnesRaw ?? "0") || 0, 10);

    await prisma.guest.create({
      data: {
        eventId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        plusOnes,
        dietaryRestrictions: dietary || null,
        sessionToken: nanoid(40),
        rsvpStatus: "CONFIRMED",
      },
    });

    existingEmails.add(email.toLowerCase());
    imported++;
  }

  revalidatePath(`/admin/eventos/${eventId}/convidados`);
  return { ok: true, imported, skipped, errors };
}
