import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireOrganizer } from "@/lib/authorization";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = await params;
  const photo = await prisma.galleryPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { await requireOrganizer(photo.eventId); } catch {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  await Promise.all([
    storage.delete(photo.storageKey).catch(() => {}),
    prisma.galleryPhoto.delete({ where: { id: photoId } }),
  ]);

  return NextResponse.json({ ok: true });
}
