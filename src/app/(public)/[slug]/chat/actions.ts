"use server";

import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { realtime } from "@/lib/realtime";
import { awardPoints } from "@/lib/points";
import { checkRateLimit } from "@/lib/auth/rate-limit";
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

  const rl = await checkRateLimit(`chat:${guest.id}`, guest.id, 30, 60);
  if (!rl.allowed) return null;

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
    reactions: {} as Record<string, string[]>,
    createdAt: msg.createdAt.toISOString(),
  };

  void awardPoints(guest.id, event.id, "chat_message");
  await realtime.trigger(`event-${event.id}`, "chat-message", payload).catch(() => null);

  return { message: payload };
}

const ReactionSchema = z.object({
  slug: z.string(),
  messageId: z.string(),
  emoji: z.string().max(8),
});

export async function toggleReaction(formData: FormData) {
  const parsed = ReactionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return null;

  const { slug, messageId, emoji } = parsed.data;
  const guest = await getCurrentGuest(slug);
  if (!guest || guest.banned) return null;

  const msg = await prisma.chatMessage.findFirst({
    where: { id: messageId, removedAt: null },
    select: { id: true, eventId: true, reactions: true },
  });
  if (!msg) return null;

  const reactions = (msg.reactions ?? {}) as Record<string, string[]>;
  const current = reactions[emoji] ?? [];
  const has = current.includes(guest.id);
  reactions[emoji] = has ? current.filter((id) => id !== guest.id) : [...current, guest.id];
  if (reactions[emoji].length === 0) delete reactions[emoji];

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { reactions },
  });

  await realtime.trigger(`event-${msg.eventId}`, "chat-reaction", {
    messageId,
    reactions,
  }).catch(() => null);

  return { reactions };
}
