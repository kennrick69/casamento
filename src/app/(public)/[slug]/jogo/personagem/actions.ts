"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";
import {
  resolveLayers,
  DEFAULT_SPEC,
  type CharacterSpec,
  type BodyType,
} from "@/lib/game/character/catalog";
import { isEventOrganizer } from "@/lib/game/character/organizer";

// Normaliza o payload do cliente para um CharacterSpec completo (defaults para
// campos ausentes). resolveLayers faz a validação real de cada id.
function toSpec(raw: Partial<CharacterSpec>): CharacterSpec {
  return {
    body: (raw.body as BodyType) ?? DEFAULT_SPEC.body,
    skin: raw.skin ?? DEFAULT_SPEC.skin,
    hairStyle: raw.hairStyle ?? DEFAULT_SPEC.hairStyle,
    hairColor: raw.hairColor ?? DEFAULT_SPEC.hairColor,
    eyeColor: raw.eyeColor ?? DEFAULT_SPEC.eyeColor,
    eyebrows: raw.eyebrows ?? DEFAULT_SPEC.eyebrows,
    beard: raw.beard ?? DEFAULT_SPEC.beard,
    glasses: raw.glasses ?? DEFAULT_SPEC.glasses,
    outfit: raw.outfit ?? DEFAULT_SPEC.outfit,
  };
}

// Salva a aparência do personagem (S3) para o jogador identificado. Valida no
// servidor (inclui bloqueio do traje de noivo/noiva p/ não-organizadores). O
// rosto completo vai na coluna `appearance` (JSON); as colunas legadas
// (skinColor/hairStyle/hairColor/outfit) seguem preenchidas p/ o mapa.
// GameCharacter tem guestId @unique → upsert.
export async function saveCharacter(
  slug: string,
  raw: Partial<CharacterSpec>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const event = await getGameEvent(slug);
  if (!event || event.experienceType !== "GAMIFIED") return { ok: false, error: "Evento inválido." };

  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, error: "Entre no jogo antes de criar o personagem." };

  const spec = toSpec(raw);
  const canRestricted = await isEventOrganizer(event.id);
  const r = resolveLayers(spec, canRestricted);
  if ("error" in r) return { ok: false, error: r.error };

  // Colunas legadas: body-type guardado junto do outfit ("feminino:vestido_rose")
  // p/ reconstruir no mapa sem nova coluna. appearance = spec completo (rosto).
  const data = {
    skinColor: spec.skin,
    hairStyle: spec.hairStyle,
    hairColor: spec.hairColor,
    outfit: `${spec.body}:${spec.outfit}`,
    appearance: spec as unknown as Prisma.InputJsonValue,
  };
  await prisma.gameCharacter.upsert({
    where: { guestId: guest.id },
    create: { guestId: guest.id, ...data },
    update: data,
  });

  // marca que o jogador já tem personagem (1ª vez) → a tela de identidade mostra
  // "Continuar jogando" em vez de "Criar meu personagem" (item 24).
  await prisma.guest.updateMany({
    where: { id: guest.id, characterClaimedAt: null },
    data: { characterClaimedAt: new Date() },
  });

  return { ok: true };
}
