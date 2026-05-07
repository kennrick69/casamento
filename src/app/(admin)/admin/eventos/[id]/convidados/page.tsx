import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GuestActions } from "./guest-actions";
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
    select: { coupleNames: true, slug: true },
  });
  if (!event) notFound();

  const guests = await prisma.guest.findMany({
    where: { eventId: id, deletedAt: null },
    orderBy: [{ rsvpStatus: "asc" }, { createdAt: "desc" }],
  });

  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED");
  const declined = guests.filter((g) => g.rsvpStatus === "DECLINED");
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING");

  const totalWithCompanions = confirmed.reduce((sum, g) => sum + 1 + g.plusOnes, 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} />

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
          <a
            href={`/api/admin/eventos/${id}/convidados/export`}
            className="text-sm text-primary hover:underline"
          >
            Exportar CSV
          </a>
        </div>

        {guests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum convidado ainda. Compartilhe o link do convite!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {[
              { label: "Confirmados", list: confirmed, color: "text-green-700 bg-green-50" },
              { label: "Recusados", list: declined, color: "text-red-600 bg-red-50" },
              { label: "Pendentes", list: pending, color: "text-yellow-700 bg-yellow-50" },
            ].map(
              ({ label, list }) =>
                list.length > 0 && (
                  <div key={label} className="mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {label} ({list.length})
                    </p>
                    <div className="flex flex-col gap-1">
                      {list.map((guest) => (
                        <div
                          key={guest.id}
                          className="bg-background border border-border rounded-lg px-4 py-3 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{guest.name}</p>
                              {guest.banned && (
                                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                  banido
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
                            {guest.plusOnes > 0 && (
                              <p className="text-xs text-muted-foreground">
                                +{guest.plusOnes} acompanhante{guest.plusOnes > 1 ? "s" : ""}
                              </p>
                            )}
                            {guest.dietaryRestrictions && (
                              <p className="text-xs text-muted-foreground">
                                🍽 {guest.dietaryRestrictions}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(guest.createdAt, "d MMM yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <GuestActions guestId={guest.id} eventId={id} banned={guest.banned} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
