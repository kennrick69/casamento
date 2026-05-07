import { NextRequest, NextResponse } from "next/server";
import { getCurrentGuest } from "@/lib/auth/guest";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";
import { awardPoints } from "@/lib/points";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const slug = formData.get("slug") as string | null;

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

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key = `${slug}/fotos/${nanoid(12)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await storage.upload(key, buffer, file.type);

  // Se moderação ativa, photo começa não aprovada
  const approved = event.contentModerationMode === "REACTIVE";

  await prisma.photo.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      storageKey: key,
      approvedByCouple: approved,
    },
  });

  void awardPoints(guest.id, event.id, "photo_upload");

  return NextResponse.json({ ok: true, key });
}
