import type { NextRequest } from "next/server";
import { resolveLayers, type CharacterSpec, type BodyType } from "@/lib/game/character/catalog";
import { composeCharacter } from "@/lib/game/character/compositor";

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

// Prévia do personagem = só pixels, função pura dos parâmetros. NÃO toca no
// banco nem na sessão: trocar uma opção apenas redesenha, e uma oscilação do DB
// jamais derruba a página (feedback do JOs, itens 8 e 9). Render-permissivo —
// desenhar noivo/noiva é inofensivo; a trava real fica no SAVE (actions.ts).
export async function GET(req: NextRequest) {
  const spec = specFromParams(req.nextUrl.searchParams);
  const r = resolveLayers(spec, true);
  if ("error" in r) return new Response(r.error, { status: 400 });
  try {
    const png = await composeCharacter(r.layers, 4);
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    // compositor falhou (asset ausente etc.): devolve erro silencioso, sem crash
    return new Response("preview indisponível", { status: 500 });
  }
}
