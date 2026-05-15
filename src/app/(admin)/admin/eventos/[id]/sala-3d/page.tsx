import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { Sala3DClient } from "./Sala3DClient";
import { getOrCreateVenue3D } from "./actions";

export const metadata: Metadata = { title: "Sala 3D" };

export default async function Sala3DPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  try { await requireOrganizer(id); } catch { notFound(); }

  const [event, venue] = await Promise.all([
    prisma.event.findUnique({ where: { id }, select: { coupleNames: true } }),
    getOrCreateVenue3D(id),
  ]);
  if (!event) notFound();

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <AdminHeader title={event.coupleNames} />
      <EventNav eventId={id} />
      <div className="mt-6">
        <h1 className="text-2xl font-bold mb-6">Sala 3D</h1>
        <Sala3DClient venue={venue} eventId={id} />
      </div>
    </div>
  );
}
