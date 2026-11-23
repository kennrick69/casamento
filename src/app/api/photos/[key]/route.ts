import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { resolveVolumeBase } from "@/lib/storage/volume-path";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

// Serve fotos do volume.
//  • Mural (`${slug}/fotos/...`): passa pela checagem de Photo (moderação →
//    foto removida nunca é servida). Fluxo de conteúdo enviado por convidado.
//  • Conteúdo CURADO pelo casal (`story/...` = memórias do Bosque, `gallery/...`
//    = galeria): público por natureza. Não há linha em Photo; a própria key
//    (nanoid imprevisível) é a credencial. Serve direto se o arquivo existe.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  // Guarda contra path traversal (../) antes de tocar no filesystem.
  if (decodedKey.includes("..")) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const isCurated = decodedKey.startsWith("story/") || decodedKey.startsWith("gallery/");

  if (!isCurated) {
    // Mural: exige foto não removida.
    const photo = await prisma.photo.findFirst({
      where: { storageKey: { contains: decodedKey } },
      include: { event: true },
    });
    if (!photo || photo.removedAt) {
      return new NextResponse("Não encontrado", { status: 404 });
    }
  }

  const exists = await storage.exists(decodedKey);
  if (!exists) return new NextResponse("Não encontrado", { status: 404 });

  // Serve the file (MESMA base que o storage usa para gravar — ver resolveVolumeBase)
  const filePath = path.join(resolveVolumeBase(), decodedKey);
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
