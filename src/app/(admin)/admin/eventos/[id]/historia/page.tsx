import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { HistoriaAdminClient } from "./historia-admin-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nossa história" };

interface Props { params: Promise<{ id: string }> }

export default async function HistoriaAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const items = await prisma.coupleStoryItem.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
  });

  const itemsWithUrls = items.map((it) => ({
    id: it.id,
    title: it.title,
    description: it.description,
    dateLabel: it.dateLabel,
    date: it.date?.toISOString() ?? null,
    photoUrl: it.photoKey ? storage.getUrl(it.photoKey) : null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Nossa história" eventId={eventId} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-2">Nossa história</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Timeline de momentos marcantes do casal. Aparece em{" "}
          <span className="font-mono text-xs">/[slug]/historia</span>.
        </p>
        <HistoriaAdminClient items={itemsWithUrls} eventId={eventId} />
      </main>
    </div>
  );
}
