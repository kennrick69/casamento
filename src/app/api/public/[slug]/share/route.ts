import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? undefined;

  let platform = "unknown";
  try {
    const body = await req.json() as { platform?: string };
    if (typeof body.platform === "string") platform = body.platform.slice(0, 32);
  } catch { /* ignore parse errors */ }

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.authLog.create({
    data: {
      action: "SHARE_LINK",
      ip,
      userAgent,
      metadata: { eventId: event.id, slug, platform },
    },
  });

  return NextResponse.json({ ok: true });
}
