import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

// Serve fotos do volume com checagem de visibilidade.
// Fotos PUBLIC: qualquer um com o link pode ver.
// Fotos COUPLE_ONLY: apenas organizadores do evento.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  const photo = await prisma.photo.findFirst({
    where: { storageKey: { contains: decodedKey } },
    include: { event: true },
  });

  if (!photo || photo.removedAt) {
    return new NextResponse("Not found", { status: 404 });
  }

  const exists = await storage.exists(decodedKey);
  if (!exists) return new NextResponse("Not found", { status: 404 });

  // Serve the file
  const filePath = path.join(
    process.env.STORAGE_PATH ?? "/data/uploads",
    decodedKey
  );
  const file = await fs.readFile(filePath);
  const ext = path.extname(decodedKey).toLowerCase();
  const contentType = ext === ".webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
