import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";
import { DEFAULT_SPEC, type CharacterSpec, type BodyType } from "@/lib/game/character/catalog";
import { MapaClient } from "./mapa-client";

export const metadata: Metadata = {
  title: "Mapa da festa",
  robots: { index: false, follow: false },
};

// Reconstrói o spec salvo (appearance JSON ou colunas legadas) e serializa como
// query string para a rota do atlas (/jogo/personagem/sheet).
function specToQuery(spec: CharacterSpec): string {
  return new URLSearchParams(spec as unknown as Record<string, string>).toString();
}

export default async function MapaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await getGameEvent(slug);
  if (!event) redirect(`/${slug}`);

  const guest = await getCurrentGuest(slug);
  if (!guest) redirect(`/${slug}/jogo`);

  const character = await prisma.gameCharacter.findUnique({ where: { guestId: guest.id } });
  if (!character) redirect(`/${slug}/jogo/personagem`);

  let spec: CharacterSpec = { ...DEFAULT_SPEC };
  if (character.appearance && typeof character.appearance === "object") {
    spec = { ...DEFAULT_SPEC, ...(character.appearance as Partial<CharacterSpec>) };
  } else {
    const [body, outfit] = character.outfit.includes(":")
      ? character.outfit.split(":")
      : ["feminino", character.outfit];
    spec = {
      ...DEFAULT_SPEC,
      body: body as BodyType,
      skin: character.skinColor,
      hairStyle: character.hairStyle,
      hairColor: character.hairColor,
      outfit,
    };
  }

  const atlasUrl = `/${slug}/jogo/personagem/sheet?${specToQuery(spec)}`;

  return (
    <MapaClient
      slug={slug}
      coupleNames={event.coupleNames}
      playerName={guest.playerName ?? "você"}
      atlasUrl={atlasUrl}
      isVisitor={guest.isVisitor}
      rsvpConfirmed={guest.rsvpStatus === "CONFIRMED"}
    />
  );
}
