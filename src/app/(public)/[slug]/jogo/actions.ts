"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import {
  getCurrentGuest,
  setGuestCookie,
  generateSessionToken,
} from "@/lib/auth/guest";
import { gameRateLimit, GAME_RATE_LIMITS } from "@/lib/game/rate-limit";
import { getGameEvent, createVisitor, claimCharacter } from "@/lib/game/identity";
import {
  buildRegistrationOptions,
  verifyRegistration,
  buildAuthenticationOptions,
  verifyAuthentication,
} from "@/lib/game/webauthn";

// ─── Modo Gamificado · Server actions de identidade (S2) ────────────────────
// Toda action revalida que o evento está GAMIFIED (getGameEvent → null caso
// contrário): o jogo nunca aparece num evento clássico. Actions com escopo de
// convidado exigem o cookie de sessão (getCurrentGuest) e conferem o evento.

export type SimpleResult = { ok: true } | { ok: false; message: string };

function tooManyTries(retryAfterSeconds: number): SimpleResult {
  return {
    ok: false,
    message: `Muitas tentativas. Aguarde ${Math.ceil(retryAfterSeconds / 60)} min.`,
  };
}

// ── Visitante (fora da lista) ───────────────────────────────────────────────

const VisitorSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1, "Diga como quer ser chamado").max(40),
});

export async function enterAsVisitor(
  slug: string,
  displayName: string
): Promise<SimpleResult> {
  const rl = await gameRateLimit("visitor", GAME_RATE_LIMITS.visitor);
  if (!rl.allowed) return tooManyTries(rl.retryAfterSeconds);

  const parsed = VisitorSchema.safeParse({ slug, displayName });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const event = await getGameEvent(parsed.data.slug);
  if (!event) return { ok: false, message: "Jogo indisponível para este evento." };

  const sessionToken = generateSessionToken();
  await createVisitor(event.id, parsed.data.displayName, sessionToken);
  await setGuestCookie(sessionToken);
  return { ok: true };
}

// ── Passkey: registro (convidado já identificado) ───────────────────────────

export type OptionsResult<T> =
  | { ok: true; options: T }
  | { ok: false; message: string };

export async function getRegistrationOptions(
  slug: string
): Promise<OptionsResult<PublicKeyCredentialCreationOptionsJSON>> {
  const event = await getGameEvent(slug);
  if (!event) return { ok: false, message: "Jogo indisponível." };
  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, message: "Identifique-se antes de criar um passkey." };
  const options = await buildRegistrationOptions({
    id: guest.id,
    name: guest.name,
    email: guest.email,
    playerName: guest.playerName,
  });
  return { ok: true, options };
}

export async function completeRegistration(
  slug: string,
  response: RegistrationResponseJSON,
  nickname?: string
): Promise<SimpleResult> {
  const event = await getGameEvent(slug);
  if (!event) return { ok: false, message: "Jogo indisponível." };
  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, message: "Sessão expirada. Identifique-se de novo." };
  return verifyRegistration(guest.id, response, nickname);
}

// ── Passkey: login ──────────────────────────────────────────────────────────

export async function getAuthenticationOptions(
  slug: string
): Promise<OptionsResult<PublicKeyCredentialRequestOptionsJSON>> {
  const event = await getGameEvent(slug);
  if (!event) return { ok: false, message: "Jogo indisponível." };
  const options = await buildAuthenticationOptions();
  return { ok: true, options };
}

export async function completeAuthentication(
  slug: string,
  response: AuthenticationResponseJSON
): Promise<SimpleResult> {
  const rl = await gameRateLimit("auth", GAME_RATE_LIMITS.auth);
  if (!rl.allowed) return tooManyTries(rl.retryAfterSeconds);

  const event = await getGameEvent(slug);
  if (!event) return { ok: false, message: "Jogo indisponível." };

  const result = await verifyAuthentication(response);
  if (!result.ok) return { ok: false, message: result.message };

  // Confere que o passkey pertence a um convidado DESTE evento antes de logar.
  const guest = await getCurrentGuestById(result.guestId, event.id);
  if (!guest) return { ok: false, message: "Passkey de outro evento." };

  await setGuestCookie(result.sessionToken);
  return { ok: true };
}

// ── Claim de boneco ──────────────────────────────────────────────────────────

const ClaimSchema = z.object({
  slug: z.string().min(1),
  playerName: z.string().min(1, "Diga seu primeiro nome").max(40),
});

export async function claimMyCharacter(
  slug: string,
  playerName: string
): Promise<SimpleResult> {
  const parsed = ClaimSchema.safeParse({ slug, playerName });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const event = await getGameEvent(parsed.data.slug);
  if (!event) return { ok: false, message: "Jogo indisponível." };
  const guest = await getCurrentGuest(parsed.data.slug);
  if (!guest) return { ok: false, message: "Identifique-se antes de reivindicar." };
  await claimCharacter(guest.id, parsed.data.playerName);
  return { ok: true };
}

// ── helper ────────────────────────────────────────────────────────────────

async function getCurrentGuestById(guestId: string, eventId: string) {
  return prisma.guest.findFirst({
    where: { id: guestId, eventId, banned: false, deletedAt: null },
    select: { id: true },
  });
}
