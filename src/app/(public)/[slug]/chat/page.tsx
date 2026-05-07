import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { ChatRoom } from "./chat-room";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;

  const result = await validateEventAccess(slug, k ?? null);
  if (!result.ok) notFound();

  const { event, guest } = result;

  const features = event.features as Record<string, boolean>;
  if (features.chat === false) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <p className="text-[var(--theme-secondary)] text-sm mt-8">Chat não disponível.</p>
      </div>
    );
  }

  const messages = await prisma.chatMessage.findMany({
    where: { eventId: event.id, removedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { guest: { select: { name: true } } },
  });

  const serialized = messages.map((m) => ({
    id: m.id,
    content: m.content,
    guestName: m.guest.name,
    guestId: m.guestId,
    createdAt: format(m.createdAt, "HH:mm", { locale: ptBR }),
  }));

  return (
    <ChatRoom
      slug={slug}
      eventId={event.id}
      initialMessages={serialized}
      guestId={guest?.id ?? null}
      guestName={guest?.name ?? null}
      pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY ?? null}
      pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? null}
    />
  );
}
