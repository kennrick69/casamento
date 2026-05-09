import { NextRequest, NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { createRequire } from "node:module";

const pdfkit = createRequire(import.meta.url)("pdfkit") as typeof import("pdfkit");

export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try { await requireOrganizer(eventId); } catch { return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      coupleNames: true,
      seatingTables: {
        orderBy: { order: "asc" },
        include: {
          assignments: { select: { guestId: true } },
        },
      },
      guests: {
        where: { deletedAt: null },
        select: { id: true, name: true, plusOnes: true },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const guestMap = new Map(event.guests.map((g) => [g.id, g]));

  const pdf = new pdfkit({ size: "A4", margin: 40 });

  pdf.fontSize(18).font("Helvetica-Bold").text(`Plano de Mesas — ${event.coupleNames}`, { align: "center" });
  pdf.moveDown(0.5);
  pdf.fontSize(10).font("Helvetica").fillColor("#666").text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} · ${event.seatingTables.length} mesas`,
    { align: "center" }
  );
  pdf.moveDown(1).fillColor("#000");

  for (const table of event.seatingTables) {
    const guests = table.assignments.map((a) => guestMap.get(a.guestId)).filter(Boolean);
    const total = guests.reduce((s, g) => s! + 1 + (g?.plusOnes ?? 0), 0);

    pdf.fontSize(12).font("Helvetica-Bold").text(
      `${table.name}  (${total}/${table.capacity} lugares)`
    );
    pdf.moveDown(0.2);

    if (guests.length === 0) {
      pdf.fontSize(10).font("Helvetica").fillColor("#999").text("  (sem convidados)").fillColor("#000");
    } else {
      for (const g of guests) {
        if (!g) continue;
        const line = g.plusOnes > 0 ? `  • ${g.name} +${g.plusOnes}` : `  • ${g.name}`;
        pdf.fontSize(10).font("Helvetica").text(line);
      }
    }
    pdf.moveDown(0.8);
    if (pdf.y > 700) pdf.addPage();
  }

  pdf.end();

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", resolve);
    pdf.on("error", reject);
  });

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mesas-${event.coupleNames.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
