import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { Event, Guest } from "@prisma/client";

// ─── Modo Gamificado · Identidade (S2) ──────────────────────────────────────
// Camada de dados da identidade do jogador. Reaproveita o model `Guest`
// (mesma sessão/cookie da experiência clássica) e adiciona:
//  - passkey WebAuthn (model GuestCredential) — ver ./webauthn.ts
//  - visitante (Guest.isVisitor) — quem não está na lista, com acesso limitado
//  - claim de boneco (Guest.characterClaimedAt + playerName) — a aparência é S3
//
// LGPD: `playerName` guarda só o 1º nome e só por opt-in; nunca nome completo.

/** Extrai só o primeiro nome (LGPD: é o único nome que o jogo exibe). */
export function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  // Limita a 40 chars pra caber em balões/etiquetas no jogo.
  return first.slice(0, 40);
}

export type GameEvent = Pick<
  Event,
  "id" | "slug" | "coupleNames" | "title" | "experienceType" | "status"
>;

/**
 * Busca o evento e confirma que está no Modo Gamificado. Retorna null quando o
 * evento não existe, está arquivado, ou ainda é CLASSIC — o chamador decide o
 * redirect/notFound. Nunca expõe o jogo de um evento clássico.
 */
export async function getGameEvent(slug: string): Promise<GameEvent | null> {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      coupleNames: true,
      title: true,
      experienceType: true,
      status: true,
    },
  });
  if (!event) return null;
  if (event.status === "ARCHIVED") return null;
  if (event.experienceType !== "GAMIFIED") return null;
  return event;
}

/** E-mail sintético e único para visitantes (mantém o NOT NULL de Guest.email
 *  sem relaxar o schema; nunca é um e-mail real nem recebe mensagens). */
function visitorEmail(): string {
  return `visitante_${randomBytes(12).toString("hex")}@visitante.voem.invalid`;
}

/**
 * Cria um convidado-visitante (fora da lista). Acesso limitado: `isVisitor`
 * marca a diferença; o jogo decide o que o visitante pode fazer. `sessionToken`
 * é gerado pelo chamador (reusa generateSessionToken de @/lib/auth/guest) para
 * manter um único ponto de geração de token.
 */
export async function createVisitor(
  eventId: string,
  displayName: string,
  sessionToken: string
): Promise<Guest> {
  const player = firstName(displayName);
  return prisma.guest.create({
    data: {
      eventId,
      name: player || "Visitante",
      email: visitorEmail(),
      isVisitor: true,
      playerName: player || "Visitante",
      rsvpStatus: "PENDING",
      // Visitante não ocupa assento nem conta como presença confirmada.
      approved: true,
      consentTerms: true,
      consentTimestamp: new Date(),
      sessionToken,
      characterClaimedAt: new Date(),
    },
  });
}

/**
 * Reivindica o boneco: marca `characterClaimedAt` e grava o `playerName`
 * (1º nome, opt-in). Idempotente — reclamar de novo só atualiza o nome.
 * A APARÊNCIA do boneco (camadas LPC) é o criador do S3; aqui é só o vínculo
 * identidade↔boneco.
 */
export async function claimCharacter(
  guestId: string,
  rawPlayerName: string
): Promise<Guest> {
  const player = firstName(rawPlayerName);
  return prisma.guest.update({
    where: { id: guestId },
    data: {
      playerName: player || null,
      characterClaimedAt: new Date(),
    },
  });
}
