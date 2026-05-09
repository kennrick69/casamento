import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { GaleriaAdminClient } from "./galeria-admin-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Galeria do casal" };

interface Props { params: Promise<{ id: string }> }

export default async function GaleriaAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const photos = await prisma.galleryPhoto.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
  });

  const photosWithUrls = photos.map((p) => ({
    id: p.id,
    url: storage.getUrl(p.storageKey),
    caption: p.caption,
    order: p.order,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Galeria do casal" eventId={eventId} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Galeria do casal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {photos.length} foto{photos.length !== 1 ? "s" : ""} · Visível na página pública do evento
            </p>
          </div>
        </div>
        <GaleriaAdminClient photos={photosWithUrls} eventId={eventId} />
      </main>
    </div>
  );
}
