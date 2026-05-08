import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { headers } from "next/headers";

const ALLOWED_EMOJIS = ["❤️", "😂", "🥹", "🎉"] as const;

const ReactionSchema = z.object({
  photoId: z.string().min(1),
  emoji: z.string().refine((e) => (ALLOWED_EMOJIS as readonly string[]).includes(e), "Emoji inválido"),
  sessionId: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`reaction:${ip}`, ip, 60, 1);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Muitas reações" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = ReactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { photoId, emoji, sessionId } = parsed.data;

  // Verify photo exists and is visible
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, removedAt: null, approvedByCouple: true },
    select: { id: true },
  });
  if (!photo) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });

  try {
    await prisma.photoReaction.create({ data: { photoId, emoji, sessionId } });
    const counts = await getReactionCounts(photoId);
    return NextResponse.json({ ok: true, counts });
  } catch {
    // Duplicate — toggle off (delete)
    await prisma.photoReaction.deleteMany({ where: { photoId, emoji, sessionId } });
    const counts = await getReactionCounts(photoId);
    return NextResponse.json({ ok: true, counts, removed: true });
  }
}

async function getReactionCounts(photoId: string) {
  const rows = await prisma.photoReaction.groupBy({
    by: ["emoji"],
    where: { photoId },
    _count: true,
  });
  return Object.fromEntries(rows.map((r) => [r.emoji, r._count]));
}
