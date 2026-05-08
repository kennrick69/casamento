import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { MuralAdminClient } from "./mural-admin-client";

interface Props { params: Promise<{ id: string }> }

export default async function MuralAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [photos, reactionStats] = await Promise.all([
    prisma.photo.findMany({
      where: { eventId, removedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        guest: { select: { name: true } },
        reactions: { select: { emoji: true } },
      },
    }),
    prisma.photoReaction.groupBy({
      by: ["emoji"],
      where: { photo: { eventId } },
      _count: true,
    }),
  ]);

  const pending = photos.filter((p) => !p.approvedByCouple);
  const approved = photos.filter((p) => p.approvedByCouple);

  const photosWithCounts = photos.map((p) => {
    const counts: Record<string, number> = {};
    for (const r of p.reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    return { ...p, reactionCounts: counts };
  });

  const totalReactions = reactionStats.reduce((sum, r) => sum + r._count, 0);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Mural" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />

        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold">Mural de fotos</h1>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
          <span>{photos.length} fotos</span>
          <span className="text-amber-700 font-medium">{pending.length} aguardando aprovação</span>
          <span>{totalReactions} reações</span>
        </div>

        <MuralAdminClient
          photos={photosWithCounts}
          eventId={eventId}
          baseUrl={baseUrl}
          pendingCount={pending.length}
          approvedCount={approved.length}
        />
      </main>
    </div>
  );
}
