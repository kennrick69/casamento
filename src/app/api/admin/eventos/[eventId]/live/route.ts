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

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try { await requireOrganizer(eventId); } catch { return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const event = await prisma.liveEvent.create({
    data: { eventId, type: parsed.data.type, title: parsed.data.title, body: parsed.data.body },
  });

  await realtime.trigger(`event-${eventId}`, "live-update", {
    id: event.id,
    type: event.type,
    title: event.title,
    body: event.body,
    createdAt: event.createdAt.toISOString(),
  });

  return NextResponse.json({ ok: true, event });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try { await requireOrganizer(eventId); } catch { return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.liveEvent.deleteMany({ where: { id, eventId } });
  return NextResponse.json({ ok: true });
}
