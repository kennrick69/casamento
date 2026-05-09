import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Readable } from "stream";

export type SaveTheDateTemplate = "classico" | "rustico" | "minimal";

interface SaveTheDateOptions {
  guestName: string;
  coupleNames: string;
  ceremonyDate: Date;
  venueName?: string;
  rsvpUrl: string;
  template: SaveTheDateTemplate;
}

const TEMPLATES: Record<SaveTheDateTemplate, { bg: string; accent: string; text: string; secondary: string }> = {
  classico:  { bg: "#9F1239", accent: "#FBBF24", text: "#FFFFFF", secondary: "rgba(255,255,255,0.75)" },
  rustico:   { bg: "#78350F", accent: "#D97706", text: "#FFFBEB", secondary: "rgba(255,251,235,0.75)" },
  minimal:   { bg: "#1C1917", accent: "#9F1239", text: "#FFFFFF", secondary: "rgba(255,255,255,0.65)" },
};

// A5 landscape: 595 × 420 pt
const W = 595;
const H = 420;

export async function generateSaveTheDatePdf(opts: SaveTheDateOptions): Promise<Buffer> {
  const tpl = TEMPLATES[opts.template];
  const dateStr = opts.ceremonyDate.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(opts.rsvpUrl, {
    width: 120,
    margin: 1,
    color: { dark: tpl.bg, light: "#FFFFFF" },
  });

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: [W, H], margin: 0, info: { Title: `Save the Date — ${opts.coupleNames}` } });
    const chunks: Buffer[] = [];
    (doc as unknown as Readable).on("data", (c: Buffer) => chunks.push(c));
    (doc as unknown as Readable).on("end", () => resolve(Buffer.concat(chunks)));
    (doc as unknown as Readable).on("error", reject);

    // Background
    doc.rect(0, 0, W, H).fill(tpl.bg);

    // Decorative left strip
    doc.rect(0, 0, 6, H).fill(tpl.accent);

    // Right column for QR code
    const qrX = W - 160;
    const qrY = H / 2 - 80;
    doc.rect(qrX - 20, 0, W - qrX + 20, H).fillOpacity(0.08).fill("#000000").fillOpacity(1);

    // QR code image
    doc.image(qrBuffer, qrX, qrY, { width: 120, height: 120 });
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(tpl.secondary)
      .text("Confirme sua presença", qrX, qrY + 126, { width: 120, align: "center" });

    // Main content area
    const cx = 40;

    // Top label
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(tpl.accent)
      .text("SAVE THE DATE", cx, 44, { characterSpacing: 3 });

    // Couple names
    doc
      .font("Helvetica-Bold")
      .fontSize(36)
      .fillColor(tpl.text)
      .text(opts.coupleNames, cx, 70, { width: qrX - cx - 20, lineGap: 4 });

    // Divider
    const divY = doc.y + 14;
    doc.moveTo(cx, divY).lineTo(cx + 80, divY).strokeColor(tpl.accent).lineWidth(1.5).stroke();

    // Date
    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor(tpl.text)
      .text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), cx, divY + 18, { width: qrX - cx - 20 });

    // Venue
    if (opts.venueName) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(tpl.secondary)
        .text(opts.venueName, cx, doc.y + 8, { width: qrX - cx - 20 });
    }

    // Guest name
    const guestY = H - 72;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(tpl.secondary)
      .text("Convidado especial", cx, guestY, { characterSpacing: 1 });
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(tpl.text)
      .text(opts.guestName, cx, guestY + 14, { width: qrX - cx - 20 });

    // Bottom accent line
    doc.rect(0, H - 5, W, 5).fill(tpl.accent);

    doc.end();
  });
}
