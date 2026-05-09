import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { GuestList } from "./guest-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Convidados" };

export default async function ConvidadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    select: { coupleNames: true, slug: true, ceremonyDate: true, publicTokenK: true },
  });
  if (!event) notFound();

  const guests = await prisma.guest.findMany({
    where: { eventId: id, deletedAt: null },
    orderBy: [{ rsvpStatus: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      plusOnes: true,
      dietaryRestrictions: true,
      rsvpStatus: true,
      banned: true,
      createdAt: true,
    },
  });

  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED");
  const totalWithCompanions = confirmed.reduce((sum, g) => sum + 1 + g.plusOnes, 0);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://casamento.app";

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} eventId={id} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={id} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">
              {guests.length} convidado{guests.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              {confirmed.length} confirmados · {totalWithCompanions} pessoas incluindo acompanhantes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/admin/eventos/${id}/convidados/importar`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Importar planilha
            </a>
            <a
              href={`/api/admin/eventos/${id}/convidados/export`}
              className="text-sm text-primary hover:underline"
            >
              Exportar CSV
            </a>
          </div>
        </div>

        <GuestList
          guests={guests}
          eventId={id}
          whatsappContext={{
            coupleNames: event.coupleNames,
            slug: event.slug,
            ceremonyDate: event.ceremonyDate.toISOString(),
            publicTokenK: event.publicTokenK,
            appUrl,
          }}
        />
      </main>
    </div>
  );
}
