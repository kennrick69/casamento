"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getGameEvent, firstName } from "@/lib/game/identity";
import { setGuestCookie, generateSessionToken } from "@/lib/auth/guest";
import { gameRateLimit, GAME_RATE_LIMITS } from "@/lib/game/rate-limit";
import { logIdentification } from "@/lib/game/audit";
import { lookupCode } from "@/lib/invite/codes";

export type RedeemResult = { ok: true; next: string } | { ok: false; message: string };

function tooMany(sec: number): RedeemResult {
  return { ok: false, message: `Muitas tentativas. Aguarde ${Math.ceil(sec / 60)} min.` };
}

// Código PESSOAL → entra como o próprio convidado (seta o cookie de sessão).
export async function enterWithPersonalCode(slug: string, code: string): Promise<RedeemResult> {
  const rl = await gameRateLimit("redeem", GAME_RATE_LIMITS.redeem);
  if (!rl.allowed) return tooMany(rl.retryAfterSeconds);

  const event = await getGameEvent(slug);
  if (!event) return { ok: false, message: "Jogo indisponível para este evento." };

  const invite = await lookupCode(event.id, code);
  if (!invite || invite.invalidatedAt) return { ok: false, message: "Convite inválido ou desativado." };
  const guest = invite.guest;
  if (!guest || guest.banned || guest.deletedAt) {
    return { ok: false, message: "Convite inválido ou desativado." };
  }

  await setGuestCookie(guest.sessionToken);
  await logIdentification(event.id, guest.id, "invite_code");
  return { ok: true, next: `/${slug}/jogo` };
}

// Acompanhantes do resgate em branco (reusa GuestCompanion do S2).
const CompanionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["ADULT", "CHILD"]),
  lapInfant: z.boolean().optional().default(false),
});

const BlankSchema = z.object({
  slug: z.string().min(1),
  code: z.string().min(1),
  name: z.string().trim().min(1, "Diga o seu nome").max(120),
  companionsJson: z.string().optional(),
});

// E-mail sintético para quem veio por convite IMPRESSO (sem e-mail). Mantém o
// NOT NULL/unique de Guest.email sem relaxar o schema; `.invalid` nunca recebe
// e-mail (trava withUndeliverableGuard).
function printedEmail(code: string): string {
  return `convite_${code.toLowerCase()}@impresso.invalid`;
}

// Código EM BRANCO → cria o convidado na lista + acompanhantes, e vincula o
// código. Reserva o código ANTES de criar o convidado (evita resgate duplo).
export async function redeemBlankCode(
  slug: string,
  code: string,
  name: string,
  companionsJson?: string
): Promise<RedeemResult> {
  const rl = await gameRateLimit("redeem", GAME_RATE_LIMITS.redeem);
  if (!rl.allowed) return tooMany(rl.retryAfterSeconds);

  const parsed = BlankSchema.safeParse({ slug, code, name, companionsJson });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const event = await getGameEvent(parsed.data.slug);
  if (!event) return { ok: false, message: "Jogo indisponível para este evento." };

  const invite = await lookupCode(event.id, parsed.data.code);
  if (!invite || invite.invalidatedAt) return { ok: false, message: "Convite inválido ou desativado." };
  if (invite.kind !== "BLANK") return { ok: false, message: "Este código é pessoal — use o seu próprio link." };
  if (invite.claimedAt || invite.guestId) {
    return { ok: false, message: "Este convite já foi usado." };
  }

  // Acompanhantes (teto do lote).
  let companions: { name: string; type: "ADULT" | "CHILD"; lapInfant: boolean }[] = [];
  if (parsed.data.companionsJson) {
    try {
      const raw = JSON.parse(parsed.data.companionsJson);
      const arr = z.array(CompanionSchema).max(invite.maxCompanions).safeParse(raw);
      if (arr.success) companions = arr.data;
    } catch {
      /* ignora companions inválidos */
    }
  }

  // 1) Reserva atômica do código (claimedAt null → now). Se 0 linhas, já foi.
  const reserved = await prisma.inviteCode.updateMany({
    where: { id: invite.id, claimedAt: null, invalidatedAt: null },
    data: { claimedAt: new Date() },
  });
  if (reserved.count === 0) return { ok: false, message: "Este convite já foi usado." };

  const sessionToken = generateSessionToken();
  const player = firstName(parsed.data.name);
  try {
    const guest = await prisma.$transaction(async (tx) => {
      const g = await tx.guest.create({
        data: {
          eventId: event.id,
          name: parsed.data.name.trim(),
          email: printedEmail(invite.code),
          isVisitor: false,
          playerName: player || parsed.data.name.trim(),
          rsvpStatus: "PENDING",
          approved: true,
          consentTerms: true,
          consentTimestamp: new Date(),
          plusOnes: companions.length,
          sessionToken,
        },
      });
      if (companions.length > 0) {
        await tx.guestCompanion.createMany({
          data: companions.map((c) => ({
            guestId: g.id,
            name: c.name,
            type: c.lapInfant ? "CHILD" : c.type,
            lapInfant: c.lapInfant,
          })),
        });
      }
      await tx.inviteCode.update({ where: { id: invite.id }, data: { guestId: g.id } });
      return g;
    });

    await setGuestCookie(sessionToken);
    await logIdentification(event.id, guest.id, "invite_code");
    // Vai para o criador de personagem; a família cria os avatares em seguida.
    return { ok: true, next: `/${slug}/jogo/personagem` };
  } catch {
    // Falhou depois de reservar → libera o código pra nova tentativa.
    await prisma.inviteCode.updateMany({
      where: { id: invite.id, guestId: null },
      data: { claimedAt: null },
    });
    return { ok: false, message: "Não foi possível concluir. Tente de novo." };
  }
}
