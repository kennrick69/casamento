import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "Convite de casamento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { coupleNames: true, ceremonyDate: true, description: true },
  });

  const coupleNames = event?.coupleNames ?? "Convite de Casamento";
  const dateStr = event
    ? event.ceremonyDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #9F1239 0%, #4C0519 50%, #1E1B2E 100%)",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Decorative rings */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
          }}
        />
        {/* Heart */}
        <div style={{ fontSize: 48, marginBottom: 24, display: "flex" }}>💍</div>
        {/* Couple names */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            letterSpacing: "-1px",
            lineHeight: 1.1,
            maxWidth: 900,
            display: "flex",
          }}
        >
          {coupleNames}
        </div>
        {/* Date */}
        {dateStr && (
          <div
            style={{
              marginTop: 24,
              fontSize: 28,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "3px",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {dateStr}
          </div>
        )}
        {/* Divider */}
        <div
          style={{
            marginTop: 32,
            width: 80,
            height: 1,
            background: "rgba(255,255,255,0.4)",
            display: "flex",
          }}
        />
        {/* Tagline */}
        <div
          style={{
            marginTop: 20,
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          CONVITE INTERATIVO · VOEM.
        </div>
      </div>
    ),
    { ...size }
  );
}
