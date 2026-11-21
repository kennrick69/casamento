import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";
import { DEFAULT_SPEC, type CharacterSpec, type BodyType } from "@/lib/game/character/catalog";
import { isEventOrganizer } from "@/lib/game/character/organizer";
import { CriadorClient } from "./criador-client";

export const metadata: Metadata = {
  title: "Criar personagem",
  robots: { index: false, follow: false },
};

export default async function PersonagemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await getGameEvent(slug);
  if (!event) redirect(`/${slug}`);
  if (event.experienceType !== "GAMIFIED") redirect(`/${slug}`);

  const guest = await getCurrentGuest(slug);
  if (!guest) redirect(`/${slug}/jogo`);

  const canRestricted = await isEventOrganizer(event.id);

  // Spec inicial = personagem salvo (se houver). Preferir `appearance` (rosto
  // completo); cair nas colunas legadas se for um registro antigo. outfit legado
  // vem "body:outfit".
  const existing = await prisma.gameCharacter.findUnique({ where: { guestId: guest.id } });
  let initial: CharacterSpec = { ...DEFAULT_SPEC };
  if (existing?.appearance && typeof existing.appearance === "object") {
    initial = { ...DEFAULT_SPEC, ...(existing.appearance as Partial<CharacterSpec>) };
  } else if (existing) {
    const [body, outfit] = existing.outfit.includes(":")
      ? existing.outfit.split(":")
      : ["feminino", existing.outfit];
    initial = {
      ...DEFAULT_SPEC,
      body: body as BodyType,
      skin: existing.skinColor,
      hairStyle: existing.hairStyle,
      hairColor: existing.hairColor,
      outfit,
    };
  }

  return (
    <CriadorClient
      slug={slug}
      playerName={guest.playerName ?? "você"}
      canRestricted={canRestricted}
      initial={initial}
    />
  );
}
