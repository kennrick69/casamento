import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { LiveAdminClient } from "./live-admin-client";
import Link from "next/link";

export const metadata: Metadata = { title: "Ao vivo" };

export default async function AoVivoAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  try { await requireOrganizer(id); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      coupleNames: true,
      slug: true,
      liveEvents: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!event) notFound();

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} eventId={id} backHref={`/admin/eventos/${id}`} />
      <EventNav eventId={id} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Transmissão ao vivo</h1>
            <p className="text-sm text-muted-foreground">
              Publique atualizações em tempo real para os convidados
            </p>
          </div>
          <Link
            href={`/${event.slug}/ao-vivo`}
            target="_blank"
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Ver página pública ↗
          </Link>
        </div>

        <LiveAdminClient
          eventId={id}
          initialEvents={event.liveEvents.map((e) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            body: e.body,
            createdAt: e.createdAt.toISOString(),
          }))}
        />
      </main>
    </div>
  );
}
