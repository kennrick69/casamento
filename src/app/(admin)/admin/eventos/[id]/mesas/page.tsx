import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { MesasClient } from "./mesas-client";

export const metadata: Metadata = { title: "Plano de mesas" };

export default async function MesasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  try { await requireOrganizer(id); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      coupleNames: true,
      slug: true,
      seatingTables: {
        orderBy: { order: "asc" },
        include: { assignments: true },
      },
      guests: {
        where: { deletedAt: null, banned: false, rsvpStatus: { not: "DECLINED" } },
        select: { id: true, name: true, email: true, plusOnes: true, rsvpStatus: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!event) notFound();

  const guestMap = Object.fromEntries(event.guests.map((g) => [g.id, g]));

  const stats = {
    totalGuests: event.guests.reduce((s, g) => s + 1 + g.plusOnes, 0),
    assigned: event.seatingTables.flatMap((t) => t.assignments).length,
    tables: event.seatingTables.length,
    totalCapacity: event.seatingTables.reduce((s, t) => s + t.capacity, 0),
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} eventId={id} backHref={`/admin/eventos/${id}`} />
      <EventNav eventId={id} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Plano de mesas</h1>
            <p className="text-sm text-muted-foreground">
              {stats.tables} mesas · capacidade total {stats.totalCapacity} ·{" "}
              {stats.assigned}/{event.guests.length} convidados alocados
            </p>
          </div>
          <a
            href={`/api/admin/eventos/${id}/mesas/export`}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            ↓ Exportar PDF
          </a>
        </div>

        <MesasClient
          eventId={id}
          tables={event.seatingTables}
          guests={event.guests}
          guestMap={guestMap}
        />
      </main>
    </div>
  );
}
