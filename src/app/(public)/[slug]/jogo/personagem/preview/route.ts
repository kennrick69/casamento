import type { NextRequest } from "next/server";
import { getGameEvent } from "@/lib/game/identity";
import { resolveLayers, type CharacterSpec, type BodyType } from "@/lib/game/character/catalog";
import { composeCharacter } from "@/lib/game/character/compositor";
import { isEventOrganizer } from "@/lib/game/character/organizer";

export const runtime = "nodejs";

export function specFromParams(q: URLSearchParams): CharacterSpec {
  return {
    body: (q.get("body") as BodyType) ?? "feminino",
    skin: q.get("skin") ?? "light",
    hairStyle: q.get("hairStyle") ?? "long",
    hairColor: q.get("hairColor") ?? "chestnut",
    eyeColor: q.get("eyeColor") ?? "castanho",
    eyebrows: q.get("eyebrows") ?? "thin",
    beard: q.get("beard") ?? "none",
    glasses: q.get("glasses") ?? "none",
    outfit: q.get("outfit") ?? "vestido_rose",
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getGameEvent(slug);
  if (!event || event.experienceType !== "GAMIFIED") {
    return new Response("not found", { status: 404 });
  }

  const canRestricted = await isEventOrganizer(event.id);
  const spec = specFromParams(req.nextUrl.searchParams);

  const r = resolveLayers(spec, canRestricted);
  if ("error" in r) return new Response(r.error, { status: 400 });

  const png = await composeCharacter(r.layers, 4);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
