import "server-only";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import type { InviteCodeKind } from "@prisma/client";
import { ALPHABET, INVITE_CODE_LENGTH, normalizeCode, formatCode } from "./normalize";

// Normalização/formatação do código vivem em ./normalize (PURO, sem DB), pra que
// o cliente ("Tenho um código") e o servidor normalizem exatamente igual.
// Reexportadas aqui para não quebrar quem já importa de "@/lib/invite/codes".
export { INVITE_CODE_LENGTH, normalizeCode, formatCode };

// 32 símbolos, 8 chars → ~1,1e12 combinações (impossível de adivinhar; o resgate
// ainda tem rate-limit).
const gen = customAlphabet(ALPHABET, INVITE_CODE_LENGTH);

// Gera um código único dentro do evento (poucas tentativas bastam: espaço
// gigante). Não garante unicidade entre eventos — o resgate é sempre por
// (evento, código), então basta ser único por evento.
async function uniqueCode(eventId: string): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = gen();
    const exists = await prisma.inviteCode.findUnique({
      where: { eventId_code: { eventId, code } },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error("Não foi possível gerar um código único (colisões seguidas).");
}

// Gera N códigos únicos de uma vez (lote impresso), checando contra os já
// existentes do evento em memória — rápido e sem corrida dentro do lote.
async function uniqueCodes(eventId: string, count: number): Promise<string[]> {
  const existing = new Set(
    (await prisma.inviteCode.findMany({ where: { eventId }, select: { code: true } })).map((r) => r.code)
  );
  const out: string[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 20 + 50) {
    guard++;
    const code = gen();
    if (existing.has(code)) continue;
    existing.add(code);
    out.push(code);
  }
  if (out.length < count) throw new Error("Não foi possível gerar códigos suficientes.");
  return out;
}

export type GuestForCode = { id: string };

// Garante que todo convidado da lista (não-visitante, não-deletado) tenha um
// código PESSOAL. Idempotente: cria só o que falta. Retorna guestId → code.
export async function ensurePersonalCodes(eventId: string): Promise<Map<string, string>> {
  const [guests, codes] = await Promise.all([
    prisma.guest.findMany({
      where: { eventId, isVisitor: false, deletedAt: null },
      select: { id: true },
    }),
    prisma.inviteCode.findMany({
      where: { eventId, kind: "PERSONAL" },
      select: { guestId: true, code: true },
    }),
  ]);

  const byGuest = new Map<string, string>();
  for (const c of codes) if (c.guestId) byGuest.set(c.guestId, c.code);

  const missing = guests.filter((g) => !byGuest.has(g.id));
  for (const g of missing) {
    const code = await uniqueCode(eventId);
    await prisma.inviteCode.create({
      data: { eventId, code, kind: "PERSONAL", guestId: g.id },
    });
    byGuest.set(g.id, code);
  }
  return byGuest;
}

// Cria um lote de códigos EM BRANCO (impressos). Retorna os códigos criados.
export async function createBlankBatch(
  eventId: string,
  count: number,
  maxCompanions: number,
  batchLabel?: string | null
): Promise<string[]> {
  const n = Math.max(1, Math.min(500, Math.floor(count)));
  const cap = Math.max(0, Math.min(10, Math.floor(maxCompanions)));
  const codes = await uniqueCodes(eventId, n);
  await prisma.inviteCode.createMany({
    data: codes.map((code) => ({
      eventId,
      code,
      kind: "BLANK" as InviteCodeKind,
      maxCompanions: cap,
      batchLabel: batchLabel?.trim() || null,
    })),
  });
  return codes;
}

// Busca um código do evento (normaliza a entrada). Traz o convidado vinculado.
export async function lookupCode(eventId: string, rawCode: string) {
  const code = normalizeCode(rawCode);
  if (code.length !== INVITE_CODE_LENGTH) return null;
  return prisma.inviteCode.findUnique({
    where: { eventId_code: { eventId, code } },
    include: {
      guest: {
        select: { id: true, name: true, playerName: true, sessionToken: true, banned: true, deletedAt: true },
      },
    },
  });
}

export async function markInviteSent(codeId: string, channel: "whatsapp" | "email"): Promise<void> {
  await prisma.inviteCode.update({
    where: { id: codeId },
    data: { sentAt: new Date(), sentChannel: channel },
  });
}

export async function setInviteInvalidated(codeId: string, invalid: boolean): Promise<void> {
  await prisma.inviteCode.update({
    where: { id: codeId },
    data: { invalidatedAt: invalid ? new Date() : null },
  });
}
