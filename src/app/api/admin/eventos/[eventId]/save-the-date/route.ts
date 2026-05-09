import { NextRequest, NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { generateSaveTheDatePdf, type SaveTheDateTemplate } from "@/lib/pdf/save-the-date";
import { createRequire } from "node:module";
import { Readable } from "stream";

// archiver is CJS with no ESM default export — use createRequire for Turbopack compatibility
const archiverCreate = createRequire(import.meta.url)("archiver") as (
  format: string,
  options?: object
) => import("archiver").Archiver;

export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try { await requireOrganizer(eventId); } catch { return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const template = (body.template as SaveTheDateTemplate) ?? "classico";
  const guestIds = body.guestIds as string[] | undefined;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { coupleNames: true, ceremonyDate: true, slug: true, publicTokenK: true },
  });
  if (!event) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const venueLoc = await prisma.eventLocation.findFirst({
    where: { eventId, type: "CEREMONY", isPublic: true },
    select: { title: true },
  });

  const guestWhere = guestIds?.length
    ? { eventId, id: { in: guestIds }, deletedAt: null }
    : { eventId, deletedAt: null, rsvpStatus: { not: "DECLINED" as const } };

  const guests = await prisma.guest.findMany({
    where: guestWhere,
    select: { id: true, name: true, sessionToken: true },
    orderBy: { name: "asc" },
  });

  if (guests.length === 0) return NextResponse.json({ error: "Nenhum convidado encontrado" }, { status: 400 });
  if (guests.length > 500) return NextResponse.json({ error: "Máximo 500 convidados por vez" }, { status: 400 });

  // Stream ZIP response
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const archive = archiverCreate("zip", { zlib: { level: 6 } });

  // Pipe archiver output to the writable stream
  const nodeReadable = Readable.from(
    (async function* () {
      for await (const chunk of archive) {
        yield chunk as Buffer;
      }
    })()
  );

  nodeReadable.on("data", (chunk: Buffer) => {
    writer.write(chunk).catch(() => {});
  });
  nodeReadable.on("end", () => writer.close().catch(() => {}));
  nodeReadable.on("error", (e) => writer.abort(e).catch(() => {}));

  // Generate PDFs concurrently (max 10 at a time to avoid memory spike)
  const chunkSize = 10;
  for (let i = 0; i < guests.length; i += chunkSize) {
    const chunk = guests.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (guest) => {
      const rsvpUrl = `${APP_URL}/${event.slug}/rsvp?k=${event.publicTokenK}&guest=${guest.sessionToken}`;
      const pdf = await generateSaveTheDatePdf({
        guestName: guest.name,
        coupleNames: event.coupleNames,
        ceremonyDate: event.ceremonyDate,
        venueName: venueLoc?.title,
        rsvpUrl,
        template,
      });
      const safeName = guest.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
      archive.append(pdf, { name: `${safeName}.pdf` });
    }));
  }

  archive.finalize();

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="save-the-date-${event.slug}.zip"`,
    },
  });
}
