import { getAppUrl } from "@/lib/app-url";
"use server";

import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { revalidatePath } from "next/cache";
import { createMpPreference } from "@/lib/mercadopago/client";

export async function reserveGift(formData: FormData) {
  const giftId = formData.get("giftId") as string;
  const slug = formData.get("slug") as string;

  const guest = await getCurrentGuest(slug);
  if (!guest || guest.rsvpStatus !== "CONFIRMED") return;

  const gift = await prisma.gift.findUnique({ where: { id: giftId } });
  if (!gift || gift.fulfilled) return;

  if (gift.reservedByGuestId === guest.id) {
    await prisma.gift.update({
      where: { id: giftId },
      data: { reservedByGuestId: null, reservedAt: null },
    });
  } else if (!gift.reservedByGuestId) {
    await prisma.gift.update({
      where: { id: giftId },
      data: { reservedByGuestId: guest.id, reservedAt: new Date() },
    });
  }

  revalidatePath(`/${slug}/presentes`);
}

// Declara intenção de presentear (modo TRUST)
export async function declareDonation(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const giftId = formData.get("giftId") as string;
  const slug = formData.get("slug") as string;
  const amountRaw = formData.get("amount") as string;

  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, error: "Faça RSVP primeiro." };

  const event = await prisma.event.findUnique({ where: { slug }, select: { id: true, donationMode: true } });
  if (!event) return { ok: false, error: "Evento não encontrado." };

  const gift = await prisma.gift.findUnique({ where: { id: giftId, eventId: event.id } });
  if (!gift) return { ok: false, error: "Presente não encontrado." };

  const amount = parseFloat(amountRaw);
  if (!amount || amount <= 0) return { ok: false, error: "Valor inválido." };

  await prisma.donation.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      giftId,
      amount,
      mode: event.donationMode,
      status: "DECLARED",
    },
  });

  // Mark gift as reserved by this guest
  if (!gift.reservedByGuestId) {
    await prisma.gift.update({
      where: { id: giftId },
      data: { reservedByGuestId: guest.id, reservedAt: new Date() },
    });
  }

  revalidatePath(`/${slug}/presentes`);
  return { ok: true };
}

// Inicia checkout Mercado Pago — retorna URL de redirect
export async function startMpCheckout(
  formData: FormData
): Promise<{ ok: true; initPoint: string } | { ok: false; error: string }> {
  const giftId = formData.get("giftId") as string;
  const slug = formData.get("slug") as string;

  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, error: "Faça RSVP primeiro." };

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, donationMode: true, mpEnabled: true },
  });
  if (!event?.mpEnabled) return { ok: false, error: "Mercado Pago não configurado." };

  const gift = await prisma.gift.findUnique({ where: { id: giftId, eventId: event.id } });
  if (!gift) return { ok: false, error: "Presente não encontrado." };
  if (!gift.price || gift.price <= 0) return { ok: false, error: "Este presente não tem valor definido." };

  // Create pending donation
  const donation = await prisma.donation.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      giftId,
      amount: gift.price,
      mode: "MERCADO_PAGO",
      status: "DECLARED",
      gatewayProvider: "mercadopago",
    },
  });

  const appUrl = getAppUrl();

  try {
    const pref = await createMpPreference(event.id, {
      giftName: gift.name,
      amount: gift.price,
      donationId: donation.id,
      guestEmail: guest.email,
      successUrl: `${appUrl}/${slug}/presentes/sucesso?d=${donation.id}`,
      failureUrl: `${appUrl}/${slug}/presentes?mp=fail`,
      pendingUrl: `${appUrl}/${slug}/presentes?mp=pending`,
    });

    const initPoint = pref.init_point;
    if (!initPoint) throw new Error("No init_point returned");

    return { ok: true, initPoint };
  } catch (err) {
    await prisma.donation.delete({ where: { id: donation.id } });
    const msg = err instanceof Error ? err.message : "Erro ao criar preferência";
    return { ok: false, error: msg };
  }
}
