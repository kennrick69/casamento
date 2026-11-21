import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { getAppUrl } from "@/lib/app-url";
import { formatCode } from "@/lib/invite/codes";

export const runtime = "nodejs";

// pdfkit tenta ler os .afm das fontes padrão (Helvetica) de um caminho que o
// bundler reescreve → ENOENT. Registramos uma TTF própria (DejaVu em
// public/fonts) e nunca usamos a fonte AFM padrão.
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
let REG: Buffer | null = null;
let BOLD: Buffer | null = null;
function fonts(): { reg: Buffer; bold: Buffer } {
  REG ??= fs.readFileSync(path.join(FONT_DIR, "DejaVuSans.ttf"));
  BOLD ??= fs.readFileSync(path.join(FONT_DIR, "DejaVuSans-Bold.ttf"));
  return { reg: REG, bold: BOLD };
}

// Gera o PDF A4 (grade de cartões com QR + código + linha de corte) dos códigos
// EM BRANCO de um evento. ?batch=<label> filtra um lote; sem filtro, pega todos
// os códigos em branco livres (não resgatados, não invalidados).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Não autorizado", { status: 401 });

  const { id } = await params;
  try {
    await requireOrganizer(id);
  } catch {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { slug: true, coupleNames: true },
  });
  if (!event) return new NextResponse("Evento não encontrado", { status: 404 });

  const batch = req.nextUrl.searchParams.get("batch");
  const codes = await prisma.inviteCode.findMany({
    where: {
      eventId: id,
      kind: "BLANK",
      invalidatedAt: null,
      claimedAt: null,
      ...(batch ? { batchLabel: batch } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { code: true },
  });

  if (codes.length === 0) {
    return new NextResponse("Nenhum código em branco disponível para imprimir.", { status: 400 });
  }

  const appUrl = getAppUrl();

  // Pré-gera os QRs (PNG) — apontam pro resgate /<slug>/c/<CODE>.
  const qrByCode = new Map<string, Buffer>();
  for (const c of codes) {
    const url = `${appUrl}/${event.slug}/c/${c.code}`;
    const png = await QRCode.toBuffer(url, { margin: 1, width: 300, errorCorrectionLevel: "M" });
    qrByCode.set(c.code, png);
  }

  // ── Layout A4: 2 colunas × 4 linhas = 8 cartões por folha ────────────────
  const { reg, bold } = fonts();
  // Passa a TTF (Buffer) como fonte inicial (evita o Helvetica.afm na
  // construção). O tipo do pdfkit diz `string`, mas aceita Buffer em runtime.
  const doc = new PDFDocument({ size: "A4", margin: 0, font: reg as unknown as string });
  doc.registerFont("reg", reg);
  doc.registerFont("bold", bold);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const COLS = 2;
  const ROWS = 4;
  const cardW = PAGE_W / COLS;
  const cardH = PAGE_H / ROWS;

  codes.forEach((c, i) => {
    const posInPage = i % (COLS * ROWS);
    if (i > 0 && posInPage === 0) doc.addPage();
    const col = posInPage % COLS;
    const row = Math.floor(posInPage / COLS);
    const x = col * cardW;
    const y = row * cardH;

    // Linha de corte (tracejado) ao redor do cartão.
    doc.save();
    doc.lineWidth(0.5).dash(3, { space: 3 }).strokeColor("#bbbbbb");
    doc.rect(x + 6, y + 6, cardW - 12, cardH - 12).stroke();
    doc.undash();
    doc.restore();

    // QR centralizado no topo do cartão.
    const qr = qrByCode.get(c.code)!;
    const qrSize = 118;
    const qrX = x + (cardW - qrSize) / 2;
    const qrY = y + 22;
    doc.image(qr, qrX, qrY, { width: qrSize, height: qrSize });

    // Frase + código.
    doc.fillColor("#2a1d12");
    doc.font("reg").fontSize(9);
    doc.text("Aponte a câmera e entre no nosso convite-jogo", x + 10, qrY + qrSize + 8, {
      width: cardW - 20,
      align: "center",
    });
    doc.font("bold").fontSize(15);
    doc.text(formatCode(c.code), x + 10, qrY + qrSize + 24, { width: cardW - 20, align: "center" });
    doc.font("reg").fontSize(8).fillColor("#6b4a2a");
    doc.text(event.coupleNames, x + 10, qrY + qrSize + 46, { width: cardW - 20, align: "center" });
  });

  doc.end();
  const pdf = await done;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="convites-${event.slug}${batch ? `-${batch}` : ""}.pdf"`,
    },
  });
}
