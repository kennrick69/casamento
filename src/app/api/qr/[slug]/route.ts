import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "png";

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, publicTokenK: true },
  });

  if (!event) {
    return new NextResponse("Not found", { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = event.publicTokenK
    ? `${baseUrl}/${slug}?k=${event.publicTokenK}`
    : `${baseUrl}/${slug}`;

  if (format === "svg") {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="qr-${slug}.svg"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    margin: 2,
    width: 512,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${slug}.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
