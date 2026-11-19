import type { NextRequest } from "next/server";
import { getGameEvent } from "@/lib/game/identity";
import { resolveLayers } from "@/lib/game/character/catalog";
import { composeSheet } from "@/lib/game/character/compositor";
import { specFromParams } from "../preview/route";

export const runtime = "nodejs";

// Atlas de caminhada do personagem (9×4 frames de 64px, resolução nativa) para o
// Phaser carregar como spritesheet. Mesmo contrato da preview, mas devolve a
// folha inteira em vez de um frame. Cacheável: a aparência é determinística
// pelos params.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getGameEvent(slug);
  if (!event || event.experienceType !== "GAMIFIED") {
    return new Response("not found", { status: 404 });
  }

  // Render-permissivo: desenhar os pixels de noivo/noiva é inofensivo (não cria
  // nem salva personagem). A trava de organizador fica no SAVE (actions.ts) — e
  // assim o atlas de um organizador-noiva também carrega no contexto do jogo,
  // além de permitir os avatares decorativos do casal no altar da Fase 3.
  const spec = specFromParams(req.nextUrl.searchParams);

  const r = resolveLayers(spec, true);
  if ("error" in r) return new Response(r.error, { status: 400 });

  const png = await composeSheet(r.layers);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // determinístico pelos params → pode cachear no browser
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
