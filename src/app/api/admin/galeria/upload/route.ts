import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireOrganizer } from "@/lib/authorization";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const eventId = formData.get("eventId") as string | null;
  const caption = (formData.get("caption") as string | null)?.trim().slice(0, 280) || null;

  if (!file || !eventId) return NextResponse.json({ error: "Dados insuficientes." }, { status: 400 });

  try { await requireOrganizer(eventId); } catch {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Tipo não suportado." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Máximo 10 MB." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `gallery/${eventId}/${nanoid()}.${ext}`;

  await storage.upload(key, buf, file.type);

  const count = await prisma.galleryPhoto.count({ where: { eventId } });
  const photo = await prisma.galleryPhoto.create({
    data: { eventId, storageKey: key, caption, order: count },
  });

  return NextResponse.json({ ok: true, id: photo.id, url: storage.getUrl(key) });
}
