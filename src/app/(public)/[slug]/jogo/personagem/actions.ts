"use server";

import { prisma } from "@/lib/db";
import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";
import { resolveLayers, type CharacterSpec, type BodyType } from "@/lib/game/character/catalog";
import { canWearBride } from "@/lib/game/character/bride";

// Salva a aparência do personagem (S3) para o jogador identificado. Valida no
// servidor (inclui bloqueio do vestido de noiva p/ não-noiva). GameCharacter
// tem guestId @unique → upsert.
export async function saveCharacter(
  slug: string,
  raw: CharacterSpec,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const event = await getGameEvent(slug);
  if (!event || event.experienceType !== "GAMIFIED") return { ok: false, error: "Evento inválido." };

  const guest = await getCurrentGuest(slug);
  if (!guest) return { ok: false, error: "Entre no jogo antes de criar o personagem." };

  const spec: CharacterSpec = {
    body: raw.body as BodyType,
    skin: raw.skin,
    hairStyle: raw.hairStyle,
    hairColor: raw.hairColor,
    outfit: raw.outfit,
  };
  const canBride = canWearBride(guest.playerName, event.coupleNames);
  const r = resolveLayers(spec, canBride);
  if ("error" in r) return { ok: false, error: r.error };

  // GameCharacter não tem coluna de body-type; guardo junto do outfit
  // ("feminino:vestido_rose") p/ reconstruir no mapa. Aditivo depois, se preciso.
  const data = {
    skinColor: spec.skin,
    hairStyle: spec.hairStyle,
    hairColor: spec.hairColor,
    outfit: `${spec.body}:${spec.outfit}`,
  };
  await prisma.gameCharacter.upsert({
    where: { guestId: guest.id },
    create: { guestId: guest.id, ...data },
    update: data,
  });

  return { ok: true };
}
