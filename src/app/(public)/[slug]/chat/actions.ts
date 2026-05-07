"use server";

import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { realtime } from "@/lib/realtime";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

const Schema = z.object({
  slug: z.string(),
  content: z.string().min(1).max(500),
});

export async function sendMessage(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return null;

  const { slug, content } = parsed.data;

  const guest = await getCurrentGuest(slug);
  if (!guest || guest.banned) return null;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, features: true },
  });
  if (!event) return null;

  const features = event.features as Record<string, boolean>;
  if (!features.chat) return null;

  const msg = await prisma.chatMessage.create({
    data: {
      eventId: event.id,
      guestId: guest.id,
      content: content.trim(),
    },
    include: { guest: { select: { name: true } } },
  });

  const payload = {
    id: msg.id,
    content: msg.content,
    guestName: msg.guest.name,
    guestId: msg.guestId,
    createdAt: format(msg.createdAt, "HH:mm", { locale: ptBR }),
  };

  // Dispara evento Pusher (noop em dev sem Pusher configurado)
  await realtime.trigger(`event-${event.id}`, "chat-message", payload).catch(() => null);

  return { message: payload };
}
