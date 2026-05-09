import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { getMpPayment } from "@/lib/mercadopago/client";
import { email } from "@/lib/email";

export const runtime = "nodejs";

// MP sends: POST with JSON body + x-signature header
// x-signature: ts=<timestamp>,v1=<hmac>
// HMAC-SHA256 of: "<request-id>:<timestamp>" keyed by mpWebhookSecret

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const topic = body.type as string | undefined;
  const dataId = (body.data as { id?: string } | undefined)?.id;

  // Only handle payment notifications
  if (topic !== "payment" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  // Find donation by gatewayPaymentId or by external_reference
  // We look up via external_reference from the MP payment itself
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  // Parse external_reference from the payment to find our donation
  // We need the event to verify HMAC, but to get the event we need the donation
  // So: first find donation by gatewayPaymentId, then verify HMAC

  let donation = await prisma.donation.findFirst({
    where: { gatewayPaymentId: dataId },
    include: {
      event: { select: { id: true, mpWebhookSecret: true, coupleNames: true } },
      guest: { select: { name: true, email: true } },
      gift: { select: { name: true } },
    },
  });

  // If not found by paymentId, try to find via external_reference from MP API
  // We need at least one event with MP configured to fetch the payment details
  if (!donation) {
    // Find by external_reference: we'll try to look up via active MP events
    const mpEvents = await prisma.event.findMany({
      where: { mpEnabled: true, mpAccessToken: { not: null } },
      select: { id: true, mpWebhookSecret: true, coupleNames: true },
      take: 50,
    });

    for (const ev of mpEvents) {
      try {
        const pay = await getMpPayment(ev.id, dataId);
        const externalRef = pay.external_reference;
        if (!externalRef) continue;

        donation = await prisma.donation.findFirst({
          where: { id: externalRef },
          include: {
            event: { select: { id: true, mpWebhookSecret: true, coupleNames: true } },
            guest: { select: { name: true, email: true } },
            gift: { select: { name: true } },
          },
        });

        if (donation) {
          // Update with the payment ID for future webhooks
          await prisma.donation.update({
            where: { id: donation.id },
            data: { gatewayPaymentId: String(dataId) },
          });
          break;
        }
      } catch { continue; }
    }
  }

  if (!donation) {
    await prisma.authLog.create({
      data: {
        action: "PAYMENT_WEBHOOK",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "mp",
        metadata: { topic, dataId, status: "donation_not_found" },
      },
    });
    return NextResponse.json({ ok: true });
  }

  const { event: donationEvent } = donation;

  // Verify HMAC signature
  if (donationEvent.mpWebhookSecret && xSignature) {
    const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? "";
    const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? "";
    const toSign = `${xRequestId}:${ts}`;
    const expected = createHmac("sha256", donationEvent.mpWebhookSecret)
      .update(toSign)
      .digest("hex");
    if (expected !== v1) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }
  }

  // Fetch payment details from MP
  let payStatus: string;
  let payAmount: number;
  try {
    const pay = await getMpPayment(donationEvent.id, dataId);
    payStatus = pay.status ?? "unknown";
    payAmount = pay.transaction_amount ?? donation.amount;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Map MP status to DonationStatus
  const newStatus = payStatus === "approved" ? "PAID"
    : payStatus === "rejected" ? "REJECTED"
    : null;

  if (newStatus && donation.status !== newStatus) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: newStatus,
        amount: payAmount,
        gatewayPaymentId: String(dataId),
        ...(newStatus === "PAID" ? { approvedAt: new Date() } : {}),
      },
    });

    // Notify casal
    if (newStatus === "PAID") {
      const organizers = await prisma.eventOrganizer.findMany({
        where: { eventId: donationEvent.id, role: "OWNER" },
        include: { user: { select: { email: true, firstName: true } } },
      });
      for (const org of organizers) {
        if (!org.user?.email) continue;
        await email.send({
          to: org.user.email,
          subject: `Nova doação de R$ ${payAmount.toFixed(2).replace(".", ",")} — ${donationEvent.coupleNames}`,
          html: `<p>Olá, ${org.user.firstName ?? ""}!</p><p><strong>${donation.guest.name}</strong> doou <strong>R$ ${payAmount.toFixed(2).replace(".", ",")}</strong>${donation.gift ? ` (${donation.gift.name})` : ""}.</p>`,
          text: `${donation.guest.name} doou R$ ${payAmount.toFixed(2)} para ${donationEvent.coupleNames}.`,
        }).catch(() => null);
      }

      // Notify guest
      if (donation.guest.email) {
        await email.send({
          to: donation.guest.email,
          subject: `Pagamento confirmado — ${donationEvent.coupleNames}`,
          html: `<p>Olá, ${donation.guest.name}!</p><p>Seu pagamento de <strong>R$ ${payAmount.toFixed(2).replace(".", ",")}</strong> foi confirmado. Obrigado pelo presente!</p>`,
          text: `Seu pagamento de R$ ${payAmount.toFixed(2)} foi confirmado. Obrigado!`,
        }).catch(() => null);
      }
    }
  }

  await prisma.authLog.create({
    data: {
      action: "PAYMENT_WEBHOOK",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "mp",
      metadata: { topic, dataId, payStatus, donationId: donation.id, newStatus },
    },
  });

  return NextResponse.json({ ok: true });
}
