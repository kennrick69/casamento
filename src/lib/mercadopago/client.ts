import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto/secrets";

interface MpEntry {
  client: MercadoPagoConfig;
  accessToken: string;
  publicKey: string;
}

const cache = new Map<string, { entry: MpEntry | null; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getMpClient(eventId: string): Promise<MpEntry | null> {
  const now = Date.now();
  const hit = cache.get(eventId);
  if (hit && now - hit.ts < CACHE_TTL) return hit.entry;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { mpEnabled: true, mpAccessToken: true, mpPublicKey: true },
  });

  if (!event?.mpEnabled || !event.mpAccessToken || !event.mpPublicKey) {
    cache.set(eventId, { entry: null, ts: now });
    return null;
  }

  try {
    const accessToken = decrypt(event.mpAccessToken);
    const publicKey = decrypt(event.mpPublicKey);
    const client = new MercadoPagoConfig({ accessToken });
    const entry: MpEntry = { client, accessToken, publicKey };
    cache.set(eventId, { entry, ts: now });
    return entry;
  } catch {
    cache.set(eventId, { entry: null, ts: now });
    return null;
  }
}

export function invalidateMpCache(eventId: string) {
  cache.delete(eventId);
}

export async function createMpPreference(
  eventId: string,
  opts: {
    giftName: string;
    amount: number;
    donationId: string;
    guestEmail: string;
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
  }
) {
  const entry = await getMpClient(eventId);
  if (!entry) throw new Error("Mercado Pago não configurado para este evento");

  const pref = new Preference(entry.client);
  return pref.create({
    body: {
      items: [
        {
          id: opts.donationId,
          title: opts.giftName,
          quantity: 1,
          unit_price: opts.amount,
          currency_id: "BRL",
        },
      ],
      payer: { email: opts.guestEmail },
      external_reference: opts.donationId,
      back_urls: {
        success: opts.successUrl,
        failure: opts.failureUrl,
        pending: opts.pendingUrl,
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    },
  });
}

export async function getMpPayment(eventId: string, paymentId: string | number) {
  const entry = await getMpClient(eventId);
  if (!entry) throw new Error("Mercado Pago não configurado");
  const pay = new Payment(entry.client);
  return pay.get({ id: Number(paymentId) });
}

export async function testMpConnection(accessToken: string): Promise<boolean> {
  try {
    const client = new MercadoPagoConfig({ accessToken });
    const pay = new Payment(client);
    await pay.search({ options: { limit: 1 } });
    return true;
  } catch {
    return false;
  }
}
