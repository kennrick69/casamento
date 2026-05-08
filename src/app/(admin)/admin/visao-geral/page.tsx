import { auth } from "@/lib/auth";
import { getOrganizerEvents } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Visão geral" };

export default async function VisaoGeralPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const organizers = await getOrganizerEvents(session.user.id);
  const eventIds = organizers.map((o) => o.event.id);

  if (eventIds.length === 0) redirect("/admin");

  const [guestCounts, photoCounts, pendingReports] = await Promise.all([
    prisma.guest.groupBy({
      by: ["eventId", "rsvpStatus"],
      where: { eventId: { in: eventIds }, deletedAt: null },
      _count: true,
    }),
    prisma.photo.groupBy({
      by: ["eventId"],
      where: { eventId: { in: eventIds } },
      _count: true,
    }),
    prisma.report.groupBy({
      by: ["eventId"],
      where: { eventId: { in: eventIds }, status: "PENDING" },
      _count: true,
    }),
  ]);

  // Build per-event maps
  const guestMap = new Map<string, { confirmed: number; declined: number; pending: number; total: number }>();
  for (const row of guestCounts) {
    const entry = guestMap.get(row.eventId) ?? { confirmed: 0, declined: 0, pending: 0, total: 0 };
    if (row.rsvpStatus === "CONFIRMED") entry.confirmed = row._count;
    else if (row.rsvpStatus === "DECLINED") entry.declined = row._count;
    else entry.pending = row._count;
    entry.total += row._count;
    guestMap.set(row.eventId, entry);
  }

  const photoMap = new Map(photoCounts.map((r) => [r.eventId, r._count]));
  const reportMap = new Map(pendingReports.map((r) => [r.eventId, r._count]));

  // Totals
  let totalConfirmed = 0;
  let totalGuests = 0;
  let totalPhotos = 0;
  let totalPendingReports = 0;
  for (const [eid, g] of guestMap) {
    totalConfirmed += g.confirmed;
    totalGuests += g.total;
    void eid;
  }
  for (const c of photoCounts) totalPhotos += c._count;
  for (const r of pendingReports) totalPendingReports += r._count;

  const now = new Date();
  const upcoming = organizers
    .filter((o) => o.event.status === "PUBLISHED")
    .sort((a, b) => a.event.ceremonyDate.getTime() - b.event.ceremonyDate.getTime());
  const drafts = organizers.filter((o) => o.event.status === "DRAFT");
  const archived = organizers.filter((o) => o.event.status === "ARCHIVED");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Meus eventos
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-semibold">Visão geral</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Global stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          <StatCard label="Eventos" value={organizers.length} />
          <StatCard label="Convidados" value={totalGuests} />
          <StatCard label="Confirmados" value={totalConfirmed} color="green" />
          <StatCard label="Fotos" value={totalPhotos} />
        </div>

        {totalPendingReports > 0 && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-red-800">
              ⚠ {totalPendingReports} denúncia{totalPendingReports !== 1 ? "s" : ""} pendente{totalPendingReports !== 1 ? "s" : ""} em {pendingReports.length} evento{pendingReports.length !== 1 ? "s" : ""}
            </p>
            <span className="text-xs text-red-600">Verifique cada evento</span>
          </div>
        )}

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Eventos publicados
            </h2>
            <div className="flex flex-col gap-3">
              {upcoming.map(({ event }) => {
                const daysLeft = differenceInCalendarDays(event.ceremonyDate, now);
                const g = guestMap.get(event.id) ?? { confirmed: 0, declined: 0, pending: 0, total: 0 };
                const reports = reportMap.get(event.id) ?? 0;
                return (
                  <Link
                    key={event.id}
                    href={`/admin/eventos/${event.id}`}
                    className="bg-background rounded-xl border border-border px-5 py-4 hover:border-primary/50 transition-colors block"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold">{event.coupleNames}</p>
                        <p className="text-xs text-muted-foreground font-mono">/{event.slug}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">
                          {daysLeft > 0
                            ? `${daysLeft}d`
                            : daysLeft === 0
                            ? "Hoje!"
                            : `−${Math.abs(daysLeft)}d`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(event.ceremonyDate, "d MMM yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="text-green-700 font-medium">{g.confirmed} confirmados</span>
                      <span>{g.pending} pendentes</span>
                      <span>{g.declined} recusados</span>
                      <span>{photoMap.get(event.id) ?? 0} fotos</span>
                      {reports > 0 && (
                        <span className="text-red-600 font-medium">⚠ {reports} denúncia{reports !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Draft events */}
        {drafts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Rascunhos ({drafts.length})
            </h2>
            <div className="flex flex-col gap-2">
              {drafts.map(({ event }) => (
                <Link
                  key={event.id}
                  href={`/admin/eventos/${event.id}/configuracoes?step=2`}
                  className="bg-background rounded-lg border border-border px-4 py-3 hover:border-primary/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{event.coupleNames}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(event.ceremonyDate, "d MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    Rascunho
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Archived events */}
        {archived.length > 0 && (
          <details>
            <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground mb-3">
              Arquivados ({archived.length})
            </summary>
            <div className="flex flex-col gap-2 mt-3">
              {archived.map(({ event }) => (
                <Link
                  key={event.id}
                  href={`/admin/eventos/${event.id}`}
                  className="bg-background rounded-lg border border-border px-4 py-3 hover:border-primary/50 transition-colors flex items-center justify-between opacity-60"
                >
                  <p className="font-medium text-sm">{event.coupleNames}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(event.ceremonyDate, "d MMM yyyy", { locale: ptBR })}
                  </p>
                </Link>
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green";
}) {
  return (
    <div className="bg-background rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums leading-none ${color === "green" ? "text-green-700" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
