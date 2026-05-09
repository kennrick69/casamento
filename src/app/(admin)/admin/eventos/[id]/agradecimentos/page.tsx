import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { AgradecimentosClient } from "./agradecimentos-client";

export const metadata: Metadata = { title: "Agradecimentos" };

export default async function AgradecimentosPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  try { await requireOrganizer(id); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      coupleNames: true,
      slug: true,
      guests: {
        where: { deletedAt: null, banned: false, rsvpStatus: "CONFIRMED" },
        select: {
          id: true, name: true, giftReceived: true, thankYouNote: true, thankYouSent: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!event) notFound();

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} eventId={id} backHref={`/admin/eventos/${id}`} />
      <EventNav eventId={id} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Agradecimentos</h1>
          <p className="text-sm text-muted-foreground">
            Gere e acompanhe mensagens de agradecimento para cada convidado
          </p>
        </div>

        <AgradecimentosClient
          eventId={id}
          coupleNames={event.coupleNames}
          guests={event.guests}
        />
      </main>
    </div>
  );
}
