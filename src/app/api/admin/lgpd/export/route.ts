import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createRequire } from "node:module";

const archiverCreate = createRequire(import.meta.url)("archiver") as (
  format: string,
  options?: object
) => import("archiver").Archiver;

export const maxDuration = 30;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "").replace(/"/g, '""');
          return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v}"` : v;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = session.user.id;

  const [user, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, marketingOptIn: true, createdAt: true,
        lastLoginAt: true, termsAcceptedAt: true, privacyAcceptedAt: true,
      },
    }),
    prisma.event.findMany({
      where: { organizers: { some: { userId } } },
      select: {
        id: true, slug: true, coupleNames: true, ceremonyDate: true, status: true,
        createdAt: true, archivedAt: true,
        guests: {
          where: { deletedAt: null },
          select: {
            name: true, email: true, phone: true, rsvpStatus: true,
            plusOnes: true, dietaryRestrictions: true, message: true,
            consentTerms: true, consentPhotoMural: true, profilePublic: true,
            createdAt: true,
            companions: {
              select: { name: true, type: true, createdAt: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        organizers: { select: { role: true, userId: true } },
      },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const archive = archiverCreate("zip", { zlib: { level: 6 } });

  const { Readable } = await import("stream");
  const nodeReadable = Readable.from(
    (async function* () {
      for await (const chunk of archive) yield chunk as Buffer;
    })()
  );
  nodeReadable.on("data", (chunk: Buffer) => writer.write(chunk).catch(() => {}));
  nodeReadable.on("end", () => writer.close().catch(() => {}));
  nodeReadable.on("error", (e) => writer.abort(e).catch(() => {}));

  // User data
  archive.append(JSON.stringify(user, null, 2), { name: "usuario.json" });

  // Events
  for (const event of events) {
    const { guests, ...eventMeta } = event;
    archive.append(JSON.stringify(eventMeta, null, 2), { name: `eventos/${event.slug}/evento.json` });
    if (guests.length > 0) {
      archive.append(
        toCsv(
          guests.map(({ companions: _companions, ...g }) => ({
            ...g,
            createdAt: g.createdAt.toISOString(),
            companionsCount: _companions.length,
          })),
        ),
        { name: `eventos/${event.slug}/convidados.csv` },
      );
      const companionsRows = guests.flatMap((g) =>
        g.companions.map((c) => ({
          guestName: g.name,
          guestEmail: g.email,
          companionName: c.name,
          companionType: c.type,
          addedAt: c.createdAt.toISOString(),
        })),
      );
      if (companionsRows.length > 0) {
        archive.append(toCsv(companionsRows), {
          name: `eventos/${event.slug}/acompanhantes.csv`,
        });
      }
    }
  }

  archive.finalize();

  const dateStr = new Date().toISOString().split("T")[0];
  return new NextResponse(readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="meus-dados-${dateStr}.zip"`,
    },
  });
}
