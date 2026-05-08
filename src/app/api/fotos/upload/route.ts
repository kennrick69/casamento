import { NextRequest, NextResponse } from "next/server";
import { getCurrentGuest } from "@/lib/auth/guest";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";
import { awardPoints } from "@/lib/points";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];

// Magic bytes map: type → [offset, bytes]
const MAGIC: Record<string, [number, number[]][]> = {
  "image/jpeg": [[0, [0xff, 0xd8, 0xff]]],
  "image/png":  [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
  "image/gif":  [[0, [0x47, 0x49, 0x46, 0x38]]],
  "image/webp": [[0, [0x52, 0x49, 0x46, 0x46]], [8, [0x57, 0x45, 0x42, 0x50]]],
  "image/heic": [[4, [0x66, 0x74, 0x79, 0x70]]],
};

function matchesMagic(buf: Buffer, type: string): boolean {
  const checks = MAGIC[type];
  if (!checks) return false;
  return checks.every(([offset, bytes]) =>
    bytes.every((b, i) => buf[offset + i] === b)
  );
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const slug = formData.get("slug") as string | null;
  const rawCaption = formData.get("caption") as string | null;
  const caption = rawCaption ? rawCaption.trim().slice(0, 280) || null : null;

  if (!file || !slug) {
    return NextResponse.json({ error: "Dados insuficientes." }, { status: 400 });
  }

  const guest = await getCurrentGuest(slug);
  if (!guest) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }
  if (guest.banned) {
    return NextResponse.json({ error: "Conta suspensa." }, { status: 403 });
  }

  const rl = await checkRateLimit(`upload:${guest.id}`, guest.id, 20, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitos envios. Aguarde um momento." }, { status: 429 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo não suportado." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Imagem muito grande. Máximo: 8 MB." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, features: true, contentModerationMode: true },
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  const features = event.features as Record<string, boolean>;
  if (!features.photoWall) {
    return NextResponse.json({ error: "Mural desativado." }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesMagic(buffer, file.type)) {
    return NextResponse.json({ error: "Arquivo inválido ou corrompido." }, { status: 400 });
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key = `${slug}/fotos/${nanoid(12)}.${ext}`;

  await storage.upload(key, buffer, file.type);

  // Se moderação ativa, photo começa não aprovada
  const approved = event.contentModerationMode === "REACTIVE";

  await prisma.photo.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      storageKey: key,
      caption,
      approvedByCouple: approved,
    },
  });

  void awardPoints(guest.id, event.id, "photo_upload");

  return NextResponse.json({ ok: true, key });
}
