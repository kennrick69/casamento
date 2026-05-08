import { NextRequest, NextResponse } from "next/server";
import { realtime } from "@/lib/realtime";
import { z } from "zod";

const Schema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(80),
  guestId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false });

  const { eventId, name, guestId } = parsed.data;
  await realtime.trigger(`event-${eventId}`, "typing", { name, guestId }).catch(() => null);
  return NextResponse.json({ ok: true });
}
