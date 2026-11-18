import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes } from "crypto";
import { checkRateLimit, type RateLimitResult } from "@/lib/auth/rate-limit";

// ─── Modo Gamificado · Rate limit de dois níveis (S2) ───────────────────────
// No salão, ~150 convidados dividem o MESMO Wi-Fi (mesmo IP). Limite só por IP
// bloquearia gente de verdade. Então usamos:
//   • por dispositivo (cookie `game_device`): limite ESTRITO — pega o abuso real
//     de um aparelho martelando (trocar o cookie é possível, mas aí o teto de IP
//     segura o flood automatizado).
//   • por IP: teto ALTO — só barra flood de script, nunca uma festa cheia.
// Os dois níveis combinados aguentam uma festa e ainda contêm abuso.

const DEVICE_COOKIE = "game_device";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

async function getOrSetDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;
  const id = randomBytes(16).toString("hex");
  store.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  return id;
}

export interface GameRateLimits {
  deviceMax: number;
  deviceWindowMin: number;
  ipMax: number;
  ipWindowMin: number;
}

// Só pode ser chamado de Server Actions / Route Handlers (define cookie).
export async function gameRateLimit(
  action: string,
  limits: GameRateLimits
): Promise<RateLimitResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const device = await getOrSetDeviceId();

  const perDevice = await checkRateLimit(
    `game:${action}:dev:${device}`,
    ip,
    limits.deviceMax,
    limits.deviceWindowMin
  );
  if (!perDevice.allowed) return perDevice;

  return checkRateLimit(`game:${action}:ip:${ip}`, ip, limits.ipMax, limits.ipWindowMin);
}

// Perfis de limite por fluxo (ver justificativa no RELATORIO §S2 rate limit).
export const GAME_RATE_LIMITS = {
  // Cria linha no banco → mais sensível. Por aparelho: 5 em 1h (ninguém precisa
  // de mais). Por IP: 300 em 5 min (muito acima de 150 convidados; barra flood).
  visitor: { deviceMax: 5, deviceWindowMin: 60, ipMax: 300, ipWindowMin: 5 },
  // Login por passkey: barato e à prova de forja (exige credencial + desafio).
  // Por aparelho: 20 em 5 min. Por IP: 600 em 5 min.
  auth: { deviceMax: 20, deviceWindowMin: 5, ipMax: 600, ipWindowMin: 5 },
  // Identificar por nome+celular (Opção B): não cria linha, mas é a superfície
  // de "adivinhar o celular de alguém". Por aparelho estrito (10 em 10 min) p/
  // conter tentativa e erro; por IP alto (300 em 5 min) p/ aguentar o salão.
  identify: { deviceMax: 10, deviceWindowMin: 10, ipMax: 300, ipWindowMin: 5 },
} as const satisfies Record<string, GameRateLimits>;
