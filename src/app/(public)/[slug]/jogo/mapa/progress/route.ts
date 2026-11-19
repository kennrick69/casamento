import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getGameEvent } from "@/lib/game/identity";
import { getCurrentGuest } from "@/lib/auth/guest";

export const runtime = "nodejs";

// Persiste o progresso do jogo do convidado (Modo Gamificado · fases) na coluna
// aditiva GameCharacter.gameProgress. Só o próprio convidado grava o seu.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getGameEvent(slug);
  if (!event) return new Response("not found", { status: 404 });

  const guest = await getCurrentGuest(slug);
  if (!guest) return new Response("unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const p = (body ?? {}) as Record<string, unknown>;
  const gameProgress = {
    phase1: !!p.phase1,
    phase2: !!p.phase2,
    phase3: !!p.phase3,
    memoriesSeen: Array.isArray(p.memoriesSeen)
      ? p.memoriesSeen.filter((x): x is string => typeof x === "string").slice(0, 50)
      : [],
  };

  const character = await prisma.gameCharacter.findUnique({ where: { guestId: guest.id }, select: { id: true } });
  if (!character) return new Response("no character", { status: 404 });

  await prisma.gameCharacter.update({
    where: { id: character.id },
    data: { gameProgress },
  });

  return Response.json({ ok: true });
}
