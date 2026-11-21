import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";
import { isEventOrganizer } from "@/lib/game/character/organizer";
import { type CharacterSpec, specFromCharacter, specToQuery } from "@/lib/game/character/catalog";
import { MapaClient, type Memory, type TableInfo, type GameProgress } from "./mapa-client";

export const metadata: Metadata = {
  title: "Mapa da festa",
  robots: { index: false, follow: false },
};

// Specs fixos do casal para os avatares decorativos no altar da Fase 3.
const BRIDE_SPEC: CharacterSpec = {
  body: "feminino",
  skin: "light",
  hairStyle: "long",
  hairColor: "chestnut",
  eyeColor: "castanho",
  eyebrows: "thin",
  beard: "none",
  glasses: "none",
  outfit: "noiva",
};
const GROOM_SPEC: CharacterSpec = {
  body: "masculino",
  skin: "light",
  hairStyle: "buzzcut",
  hairColor: "black",
  eyeColor: "castanho",
  eyebrows: "thick",
  beard: "curta",
  glasses: "none",
  outfit: "noivo",
};

function parseProgress(raw: unknown): GameProgress {
  const p = (raw ?? {}) as Partial<GameProgress>;
  return {
    phase1: !!p.phase1,
    phase2: !!p.phase2,
    phase3: !!p.phase3,
    memoriesSeen: Array.isArray(p.memoriesSeen) ? p.memoriesSeen.filter((x) => typeof x === "string") : [],
  };
}

export default async function MapaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await getGameEvent(slug);
  if (!event) redirect(`/${slug}`);

  const guest = await getCurrentGuest(slug);
  if (!guest) redirect(`/${slug}/jogo`);

  const character = await prisma.gameCharacter.findUnique({ where: { guestId: guest.id } });
  if (!character) redirect(`/${slug}/jogo/personagem`);

  // Spec salvo (appearance JSON ou colunas legadas)
  const spec: CharacterSpec = specFromCharacter(character);

  // Dados das fases
  const [storyItems, seatingTables, myAssignment] = await Promise.all([
    prisma.coupleStoryItem.findMany({
      where: { eventId: event.id },
      orderBy: { order: "asc" },
      take: 5,
    }),
    prisma.seatingTable.findMany({
      where: { eventId: event.id },
      orderBy: { order: "asc" },
      take: 10,
    }),
    prisma.seatingAssignment.findUnique({ where: { guestId: guest.id } }),
  ]);

  const memories: Memory[] = storyItems.map((s) => ({
    id: s.id,
    title: s.title,
    dateLabel: s.dateLabel ?? null,
    description: s.description ?? null,
    photoUrl: s.photoKey ? storage.getUrl(s.photoKey) : null,
  }));

  const tables: TableInfo[] = seatingTables.map((t) => ({ id: t.id, name: t.name, capacity: t.capacity }));
  const myTableId = myAssignment?.tableId ?? null;

  // Organizador logado (noivo/noiva) joga com tudo liberado — modo de teste (item 31).
  const isOrganizer = await isEventOrganizer(event.id);

  const atlasUrl = `/${slug}/jogo/personagem/sheet?${specToQuery(spec)}`;
  const brideAtlas = `/${slug}/jogo/personagem/sheet?${specToQuery(BRIDE_SPEC)}`;
  const groomAtlas = `/${slug}/jogo/personagem/sheet?${specToQuery(GROOM_SPEC)}`;

  return (
    <>
      {/* Item 55: removidos os <link rel="preload"> do Phaser/mapa/atlas. O Phaser
          carrega por caminho próprio (script injetado + loader XHR/Image com outra
          URL/crossOrigin), então o navegador descartava esses preloads e avisava
          "preloaded but not used". O GameCanvas (dynamic import) já baixa tudo assim
          que hidrata — o gargalo real é o chunk, não o preload. Console limpo. */}
      <MapaClient
        slug={slug}
      coupleNames={event.coupleNames}
      playerName={guest.playerName ?? "você"}
      atlasUrl={atlasUrl}
      isVisitor={guest.isVisitor}
      isOrganizer={isOrganizer}
      rsvpConfirmed={guest.rsvpStatus === "CONFIRMED"}
      memories={memories}
      tables={tables}
      myTableId={myTableId}
      coupleMessage={null}
      brideAtlas={brideAtlas}
      groomAtlas={groomAtlas}
      progress={parseProgress(character.gameProgress)}
      />
    </>
  );
}
