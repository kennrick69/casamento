import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { AoVivoClient } from "./ao-vivo-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ao vivo" };

export default async function AoVivoPage({
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

  const { event } = result;

  const liveEvents = await prisma.liveEvent.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AoVivoClient
      eventId={event.id}
      initialEvents={liveEvents.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        body: e.body,
        createdAt: e.createdAt.toISOString(),
      }))}
      pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY ?? ""}
      pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2"}
      coupleNames={event.coupleNames}
    />
  );
}
