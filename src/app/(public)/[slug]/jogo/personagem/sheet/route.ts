import type { NextRequest } from "next/server";
import { resolveLayers } from "@/lib/game/character/catalog";
import { composeSheet } from "@/lib/game/character/compositor";
import { specFromParams } from "../preview/route";

export const runtime = "nodejs";

// Atlas de caminhada do personagem (9×4 frames de 64px, resolução nativa) para o
// Phaser carregar como spritesheet. Mesmo contrato da preview: função pura dos
// parâmetros, SEM banco nem sessão (itens 8/9 — o avatar nunca depende do DB).
// Render-permissivo: desenhar os pixels de noivo/noiva é inofensivo (não cria
// nem salva personagem); a trava de organizador fica no SAVE (actions.ts), o que
// também permite os avatares decorativos do casal no altar da Fase 3.
export async function GET(req: NextRequest) {
  const spec = specFromParams(req.nextUrl.searchParams);
  const r = resolveLayers(spec, true);
  if ("error" in r) return new Response(r.error, { status: 400 });
  try {
    const png = await composeSheet(r.layers);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // determinístico pelos params → pode cachear no browser
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response("sheet indisponível", { status: 500 });
  }
}
