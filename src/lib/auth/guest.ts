import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import type { Event, Guest, Theme } from "@prisma/client";

export const GUEST_COOKIE = "guest_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

export type GuestWithEvent = Guest & { event: Event & { theme: Theme } };

// Lê e valida o sessionToken do cookie para um evento específico.
// Retorna null se não houver cookie válido ou se o convidado estiver banido/deletado.
export async function getCurrentGuest(slug: string): Promise<GuestWithEvent | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_COOKIE)?.value;
  if (!token) return null;

  return prisma.guest.findFirst({
    where: {
      sessionToken: token,
      event: { slug },
      banned: false,
      deletedAt: null,
    },
    include: { event: { include: { theme: true } } },
  });
}

// Valida se o convidado tem acesso ao evento via sessionToken (cookie) ou
// token público `k` (da URL do convite). Retorna o evento e o convidado, ou
// um erro que a página deve tratar.
export type AccessResult =
  | { ok: true; event: Event & { theme: Theme }; guest: GuestWithEvent | null }
  | { ok: false; error: "NOT_FOUND" | "INVALID_TOKEN" | "ARCHIVED" };

export async function validateEventAccess(
  slug: string,
  k: string | null
): Promise<AccessResult> {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { theme: true },
  });

  if (!event) return { ok: false, error: "NOT_FOUND" };
  if (event.status === "ARCHIVED") return { ok: false, error: "ARCHIVED" };

  // Convidado já identificado via cookie
  const guest = await getCurrentGuest(slug);
  if (guest) return { ok: true, event, guest };

  // Acesso via token do convite
  if (k && k === event.publicTokenK) return { ok: true, event, guest: null };

  // Evento em DRAFT também aceita o token k (noivos testando)
  if (event.status === "DRAFT" && k === event.publicTokenK) {
    return { ok: true, event, guest: null };
  }

  return { ok: false, error: "INVALID_TOKEN" };
}

// Gera sessionToken aleatório para novos convidados
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

// Define o cookie de sessão do convidado (chamado em Server Actions)
export async function setGuestCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}

// Remove o cookie de sessão (esqueçam de mim)
export async function clearGuestCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE);
}

// ─── Magic link de recuperação de identidade ──────────────────────────────

const RECOVERY_SECRET =
  process.env.NEXTAUTH_SECRET ?? "dev-recovery-secret-placeholder";

// Assina o sessionToken com HMAC para gerar um magic link seguro (válido 24h)
export function signRecoveryToken(sessionToken: string, expiresAt: number): string {
  const payload = `${sessionToken}:${expiresAt}`;
  const sig = createHmac("sha256", RECOVERY_SECRET).update(payload).digest("hex");
  const raw = Buffer.from(`${payload}:${sig}`).toString("base64url");
  return raw;
}

// Verifica e extrai o sessionToken de um magic link
export function verifyRecoveryToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [sessionToken, expiresAtStr, sig] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return null;

    const payload = `${sessionToken}:${expiresAtStr}`;
    const expected = createHmac("sha256", RECOVERY_SECRET).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(sig, "hex");
    if (expectedBuf.length !== sigBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, sigBuf)) return null;

    return sessionToken;
  } catch {
    return null;
  }
}
