"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { encrypt, canEncrypt } from "@/lib/crypto/secrets";
import { testMpConnection, invalidateMpCache } from "@/lib/mercadopago/client";
import { revalidatePath } from "next/cache";

const SaveSchema = z.object({
  eventId: z.string(),
  donationMode: z.enum(["TRUST", "PIX_PROOF", "MERCADO_PAGO"]),
  pixKey: z.string().optional(),
  mpPublicKey: z.string().optional(),
  mpAccessToken: z.string().optional(),
});

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function savePaymentConfig(formData: FormData): Promise<SaveResult> {
  const parsed = SaveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { eventId, donationMode, pixKey, mpPublicKey, mpAccessToken } = parsed.data;

  try { await requireOrganizer(eventId); } catch {
    return { ok: false, error: "Sem permissão." };
  }

  if (donationMode === "MERCADO_PAGO") {
    if (!canEncrypt()) {
      return { ok: false, error: "ENCRYPTION_KEY não configurada — não é possível salvar credentials." };
    }
    if (!mpPublicKey || !mpAccessToken) {
      return { ok: false, error: "Public Key e Access Token são obrigatórios para Mercado Pago." };
    }
  }

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: { mpWebhookSecret: true },
  });

  const webhookSecret = existing?.mpWebhookSecret ?? randomBytes(32).toString("hex");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      donationMode,
      pixKey: pixKey || null,
      mpEnabled: donationMode === "MERCADO_PAGO",
      mpWebhookSecret: webhookSecret,
      ...(donationMode === "MERCADO_PAGO" && mpPublicKey && mpAccessToken
        ? { mpPublicKey: encrypt(mpPublicKey), mpAccessToken: encrypt(mpAccessToken) }
        : {}),
    },
  });

  invalidateMpCache(eventId);
  revalidatePath(`/admin/eventos/${eventId}/configuracoes/pagamentos`);
  return { ok: true };
}

export type TestResult = { ok: true } | { ok: false; error: string };

export async function testMpCredentials(formData: FormData): Promise<TestResult> {
  const eventId = formData.get("eventId") as string;
  const accessToken = formData.get("mpAccessToken") as string;

  if (!eventId || !accessToken) return { ok: false, error: "Dados insuficientes." };
  try { await requireOrganizer(eventId); } catch {
    return { ok: false, error: "Sem permissão." };
  }

  const ok = await testMpConnection(accessToken);
  return ok ? { ok: true } : { ok: false, error: "Credenciais inválidas ou sem acesso à API Mercado Pago." };
}
