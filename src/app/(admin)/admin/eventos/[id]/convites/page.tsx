import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { firstName } from "@/lib/game/identity";
import { formatCode } from "@/lib/invite/codes";
import { ConvitesClient, type CodeRow } from "./convites-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Convites impressos" };

export default async function ConvitesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  try {
    await requireOrganizer(id);
  } catch {
    notFound();
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { coupleNames: true, slug: true, experienceType: true },
  });
  if (!event) notFound();
  // Convites por código só existem no Modo Gamificado (levam ao jogo).
  if (event.experienceType !== "GAMIFIED") redirect(`/admin/eventos/${id}/convidados`);

  const blanks = await prisma.inviteCode.findMany({
    where: { eventId: id, kind: "BLANK" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      code: true,
      batchLabel: true,
      maxCompanions: true,
      claimedAt: true,
      invalidatedAt: true,
      guest: { select: { name: true, playerName: true } },
    },
  });

  const rows: CodeRow[] = blanks.map((b) => ({
    id: b.id,
    code: formatCode(b.code),
    batchLabel: b.batchLabel,
    maxCompanions: b.maxCompanions,
    status: b.invalidatedAt ? "invalid" : b.claimedAt ? "used" : "free",
    claimant: b.guest ? firstName(b.guest.playerName ?? b.guest.name) : null,
    claimedAt: b.claimedAt ? b.claimedAt.toISOString() : null,
  }));

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} eventId={id} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={id} />
        <ConvitesClient eventId={id} rows={rows} />
      </main>
    </div>
  );
}
