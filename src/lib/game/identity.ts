import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { VISITOR_EMAIL_DOMAIN } from "@/lib/guest-filters";
import type { Event, Guest } from "@prisma/client";

// ─── Modo Gamificado · Identidade (S2) ──────────────────────────────────────
// Camada de dados da identidade do jogador. Reaproveita o model `Guest`
// (mesma sessão/cookie da experiência clássica) e adiciona:
//  - passkey WebAuthn (model GuestCredential) — ver ./webauthn.ts
//  - visitante (Guest.isVisitor) — quem não está na lista, com acesso limitado
//  - claim de boneco (Guest.characterClaimedAt + playerName) — a aparência é S3
//
// LGPD: `playerName` guarda só o 1º nome e só por opt-in; nunca nome completo.

// ─── Normalização e match de nome + celular (Opção B) ───────────────────────

/** Normaliza nome: sem acento, minúsculo, espaços colapsados. */
export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Só dígitos; remove o código do país (55) quando é número BR completo. */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d;
}

/**
 * Nome bate se o PRIMEIRO nome é igual (exato) e cada token seguinte do input
 * é prefixo do sobrenome correspondente (aceita "Marta", "Marta Silva",
 * "Marta Sil" para "Marta Silva Souza"; recusa "Mart" e "Silva" sozinho).
 */
export function nameMatches(input: string, guestName: string): boolean {
  const it = normalizeName(input).split(" ").filter(Boolean);
  const gt = normalizeName(guestName).split(" ").filter(Boolean);
  if (it.length === 0 || it.length > gt.length) return false;
  if (it[0] !== gt[0]) return false;
  for (let k = 1; k < it.length; k++) {
    if (!gt[k]!.startsWith(it[k]!)) return false;
  }
  return true;
}

/**
 * Celular bate por igualdade normalizada OU pelos últimos 8–9 dígitos
 * (assinante), tolerando DDD/55 ausentes de um dos lados.
 */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na.length < 8 || nb.length < 8) return false;
  if (na === nb) return true;
  // Ambos com DDD (>=10 dígitos): exige igualdade — DDDs diferentes NÃO batem,
  // mesmo com o mesmo número de assinante (evita falso-positivo entre cidades).
  if (na.length >= 10 && nb.length >= 10) return false;
  // Um dos lados sem DDD: compara o número do assinante (últimos 8–9 dígitos).
  const n = Math.min(na.length, nb.length, 9);
  if (n < 8) return false;
  return na.slice(-n) === nb.slice(-n);
}

export type IdentifiableGuest = Pick<
  Guest,
  "id" | "name" | "email" | "sessionToken" | "playerName" | "isVisitor"
>;

/**
 * Acha o convidado por NOME + CELULAR juntos. Retorna o convidado só quando
 * EXATAMENTE um bate nos dois campos; 0 ou ambíguo (>1) → null (o chamador
 * responde genérico, sem revelar nome). Visitantes e removidos ficam de fora.
 */
export async function findGuestByNamePhone(
  eventId: string,
  name: string,
  phone: string
): Promise<IdentifiableGuest | null> {
  const candidates = await prisma.guest.findMany({
    where: { eventId, deletedAt: null, banned: false, isVisitor: false, phone: { not: null } },
    select: { id: true, name: true, email: true, sessionToken: true, playerName: true, isVisitor: true, phone: true },
  });
  const matches = candidates.filter(
    (g) => g.phone != null && phonesMatch(phone, g.phone) && nameMatches(name, g.name)
  );
  if (matches.length !== 1) return null;
  const { phone: _omit, ...guest } = matches[0]!;
  void _omit;
  return guest;
}

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
  return `visitante_${randomBytes(12).toString("hex")}@${VISITOR_EMAIL_DOMAIN}`;
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
