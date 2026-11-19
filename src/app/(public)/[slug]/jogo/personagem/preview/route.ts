import type { NextRequest } from "next/server";
import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";
import { resolveLayers, type CharacterSpec, type BodyType } from "@/lib/game/character/catalog";
import { composeCharacter } from "@/lib/game/character/compositor";
import { canWearBride } from "@/lib/game/character/bride";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getGameEvent(slug);
  if (!event || event.experienceType !== "GAMIFIED") {
    return new Response("not found", { status: 404 });
  }

  const guest = await getCurrentGuest(slug);
  const canBride = canWearBride(guest?.playerName ?? null, event.coupleNames);

  const q = req.nextUrl.searchParams;
  const spec: CharacterSpec = {
    body: (q.get("body") as BodyType) ?? "feminino",
    skin: q.get("skin") ?? "light",
    hairStyle: q.get("hairStyle") ?? "long",
    hairColor: q.get("hairColor") ?? "chestnut",
    outfit: q.get("outfit") ?? "vestido_rose",
  };

  const r = resolveLayers(spec, canBride);
  if ("error" in r) return new Response(r.error, { status: 400 });

  const png = await composeCharacter(r.layers, 4);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
