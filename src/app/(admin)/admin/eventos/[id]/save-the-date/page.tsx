import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { SaveTheDateClient } from "./save-the-date-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Save the Date" };

interface Props { params: Promise<{ id: string }> }

export default async function SaveTheDatePage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { coupleNames: true, ceremonyDate: true },
  });
  if (!event) notFound();

  const guestCount = await prisma.guest.count({
    where: { eventId, deletedAt: null, rsvpStatus: { not: "DECLINED" } },
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Save the Date" eventId={eventId} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-1">Save the Date</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Gera um PDF personalizado por convidado com QR code único. Todos os PDFs são compactados em um ZIP para download.
        </p>
        <SaveTheDateClient
          eventId={eventId}
          coupleNames={event.coupleNames}
          ceremonyDate={event.ceremonyDate.toISOString()}
          guestCount={guestCount}
        />
      </main>
    </div>
  );
}
