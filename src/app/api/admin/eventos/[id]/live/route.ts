import { NextRequest, NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { realtime } from "@/lib/realtime";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["update", "ceremony", "toast", "music", "photo", "custom"]).default("update"),
  title: z.string().min(1).max(100),
  body: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await requireOrganizer(id); } catch { return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const liveEvent = await prisma.liveEvent.create({
    data: { eventId: id, type: parsed.data.type, title: parsed.data.title, body: parsed.data.body },
  });

  await realtime.trigger(`event-${id}`, "live-update", {
    id: liveEvent.id,
    type: liveEvent.type,
    title: liveEvent.title,
    body: liveEvent.body,
    createdAt: liveEvent.createdAt.toISOString(),
  });

  return NextResponse.json({ ok: true, event: liveEvent });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await requireOrganizer(id); } catch { return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const liveEventId = searchParams.get("id");
  if (!liveEventId) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.liveEvent.deleteMany({ where: { id: liveEventId, eventId: id } });
  return NextResponse.json({ ok: true });
}
