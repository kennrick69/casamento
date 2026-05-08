import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminChatClient } from "./admin-chat-client";

interface Props { params: Promise<{ id: string }> }

export default async function AdminChatPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const messages = await prisma.chatMessage.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { guest: { select: { name: true, banned: true } } },
  });

  const serialized = messages.map((m) => ({
    id: m.id,
    content: m.content,
    guestName: m.guest.name,
    guestId: m.guestId,
    banned: m.guest.banned,
    removedAt: m.removedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Chat" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Moderação do chat</h1>
          <p className="text-sm text-muted-foreground">{messages.length} mensagens</p>
        </div>
        <AdminChatClient messages={serialized} eventId={eventId} />
      </main>
    </div>
  );
}
