"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isHttpUrl } from "@/lib/utils/safe-href";

const GiftSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  price: z.string().optional(),
  externalLink: z.string().url().refine((u) => isHttpUrl(u), "URL deve começar com https://").optional().or(z.literal("")),
});

export async function createGift(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const parsed = GiftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Preencha os campos obrigatórios." };

  const { eventId, name, description, price, externalLink } = parsed.data;
  try { await requireOrganizer(eventId); } catch { return { ok: false, error: "Sem permissão." }; }

  await prisma.gift.create({
    data: {
      eventId,
      name: name.trim(),
      description: description?.trim() || null,
      price: (() => { const n = price ? parseFloat(price) : NaN; return Number.isFinite(n) ? n : null; })(),
      externalLink: externalLink || null,
    },
  });
  revalidatePath(`/admin/eventos/${eventId}/presentes`);
  return { ok: true };
}

export async function deleteGift(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  const giftId = formData.get("giftId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.gift.deleteMany({ where: { id: giftId, eventId } });
  revalidatePath(`/admin/eventos/${eventId}/presentes`);
  return { ok: true };
}

export async function toggleFulfilled(formData: FormData): Promise<{ ok: boolean; nowFulfilled: boolean }> {
  const eventId = formData.get("eventId") as string;
  const giftId = formData.get("giftId") as string;
  const fulfilled = formData.get("fulfilled") === "true";
  try { await requireOrganizer(eventId); } catch { return { ok: false, nowFulfilled: fulfilled }; }

  await prisma.gift.updateMany({ where: { id: giftId, eventId }, data: { fulfilled: !fulfilled } });
  revalidatePath(`/admin/eventos/${eventId}/presentes`);
  return { ok: true, nowFulfilled: !fulfilled };
}

export async function approveDonation(eventId: string, donationId: string): Promise<{ ok: boolean }> {
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.donation.updateMany({
    where: { id: donationId, eventId },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  revalidatePath(`/admin/eventos/${eventId}/presentes`);
  return { ok: true };
}

export async function rejectDonation(eventId: string, donationId: string): Promise<{ ok: boolean }> {
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  await prisma.donation.updateMany({
    where: { id: donationId, eventId },
    data: { status: "REJECTED" },
  });
  revalidatePath(`/admin/eventos/${eventId}/presentes`);
  return { ok: true };
}
