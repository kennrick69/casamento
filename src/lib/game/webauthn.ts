import "server-only";
import { cookies } from "next/headers";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import type { GuestCredential } from "@prisma/client";

// ─── Modo Gamificado · Passkey WebAuthn (S2) ────────────────────────────────
// Login sem senha e à prova de phishing via @simplewebauthn/server. O passkey
// fica no dispositivo do convidado (Face ID/Touch ID/PIN/chave física); nós só
// guardamos a chave pública + contador anti-clonagem no model GuestCredential.
//
// Fallback quando o convidado não tem/quer passkey: o acesso por e-mail (magic
// link) que já existe em /[slug]/recuperar. SMS/WhatsApp fica para quando o
// custo da API oficial for aprovado (ver doc §12.4) — não inventamos SMS aqui.
//
// RP ID = host do app (ex.: joseeleticia.com; localhost em dev). Como todos os
// eventos moram no mesmo domínio (/[slug]), o passkey é escopado ao domínio e
// amarrado a um Guest específico (que pertence a um evento).

const CHALLENGE_TTL = 5 * 60; // segundos

/** Origin e RP ID derivados do NEXT_PUBLIC_APP_URL. Em dev com
 *  ALLOW_LOCALHOST_APP_URL o host vira "localhost" — contexto seguro válido
 *  para WebAuthn (ver src/instrumentation.ts / Opção A). */
export function getRpParams(): { rpID: string; origin: string } {
  const origin = getAppUrl();
  const rpID = new URL(origin).hostname;
  return { rpID, origin };
}

type ChallengeKind = "reg" | "auth";
function challengeCookieName(kind: ChallengeKind): string {
  return `game_wa_${kind}`;
}

async function setChallenge(kind: ChallengeKind, value: string): Promise<void> {
  const store = await cookies();
  store.set(challengeCookieName(kind), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: CHALLENGE_TTL,
    path: "/",
    sameSite: "lax",
  });
}

async function takeChallenge(kind: ChallengeKind): Promise<string | null> {
  const store = await cookies();
  const value = store.get(challengeCookieName(kind))?.value ?? null;
  // Desafio é de uso único: apaga ao ler.
  store.delete(challengeCookieName(kind));
  return value;
}

function parseTransports(csv: string | null): string[] | undefined {
  if (!csv) return undefined;
  const list = csv.split(",").map((t) => t.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

// ─── Registro (criar passkey para um Guest já identificado) ─────────────────

export async function buildRegistrationOptions(guest: {
  id: string;
  name: string;
  email: string;
  playerName: string | null;
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpID } = getRpParams();

  const existing = await prisma.guestCredential.findMany({
    where: { guestId: guest.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: "Voem.",
    rpID,
    userName: guest.email,
    userDisplayName: guest.playerName ?? guest.name,
    userID: new TextEncoder().encode(guest.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await setChallenge("reg", options.challenge);
  return options;
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; message: string };

export async function verifyRegistration(
  guestId: string,
  response: RegistrationResponseJSON,
  nickname?: string
): Promise<RegisterResult> {
  const expectedChallenge = await takeChallenge("reg");
  if (!expectedChallenge) {
    return { ok: false, message: "Desafio expirado. Tente de novo." };
  }

  const { rpID, origin } = getRpParams();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch {
    return { ok: false, message: "Não consegui validar o passkey." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, message: "Passkey não verificado." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await prisma.guestCredential.create({
    data: {
      guestId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports?.join(",") ?? null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      nickname: nickname?.slice(0, 60) || null,
    },
  });

  return { ok: true };
}

// ─── Autenticação (login por passkey) ───────────────────────────────────────

export async function buildAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = getRpParams();
  // allowCredentials vazio => o navegador oferece qualquer passkey residente do
  // domínio (discoverable). Identificamos o Guest pela credential retornada.
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });
  await setChallenge("auth", options.challenge);
  return options;
}

export type AuthResult =
  | { ok: true; guestId: string; sessionToken: string }
  | { ok: false; message: string };

export async function verifyAuthentication(
  response: AuthenticationResponseJSON
): Promise<AuthResult> {
  const expectedChallenge = await takeChallenge("auth");
  if (!expectedChallenge) {
    return { ok: false, message: "Desafio expirado. Tente de novo." };
  }

  const credential: GuestCredential | null =
    await prisma.guestCredential.findUnique({
      where: { credentialId: response.id },
      // Inclui o guest para recuperar o sessionToken sem outra query.
    });

  if (!credential) {
    return { ok: false, message: "Passkey desconhecido. Use outro acesso." };
  }

  const guest = await prisma.guest.findFirst({
    where: { id: credential.guestId, banned: false, deletedAt: null },
    select: { id: true, sessionToken: true },
  });
  if (!guest) {
    return { ok: false, message: "Conta indisponível." };
  }

  const { rpID, origin } = getRpParams();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: credential.counter,
        transports: parseTransports(credential.transports),
      },
      requireUserVerification: false,
    });
  } catch {
    return { ok: false, message: "Não consegui validar o passkey." };
  }

  if (!verification.verified) {
    return { ok: false, message: "Passkey não verificado." };
  }

  // Atualiza o contador anti-clonagem e o último uso.
  await prisma.guestCredential.update({
    where: { id: credential.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  return { ok: true, guestId: guest.id, sessionToken: guest.sessionToken };
}
