import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { RsvpChart } from "./rsvp-chart";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

interface Props { params: Promise<{ id: string }> }

export default async function AnalyticsPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { coupleNames: true, ceremonyDate: true, timezone: true },
  });
  if (!event) notFound();

  const now = new Date();
  const _since = subDays(now, 30);

  const [guests, photos, songs] = await Promise.all([
    prisma.guest.findMany({
      where: { eventId, deletedAt: null },
      select: { rsvpStatus: true, plusOnes: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.photo.findMany({
      where: { eventId, removedAt: null, approvedByCouple: true },
      select: { id: true, caption: true, createdAt: true, reactions: { select: { emoji: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.playlistSuggestion.findMany({
      where: { eventId, songStatus: "APPROVED" },
      select: { id: true, trackName: true, artist: true, votes: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED");
  const declined = guests.filter((g) => g.rsvpStatus === "DECLINED");
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING");
  const totalPeople = confirmed.reduce((sum, g) => sum + 1 + g.plusOnes, 0);

  // RSVP timeline — group by date
  const rsvpByDate: Record<string, { confirmed: number; declined: number }> = {};
  for (const g of guests) {
    const d = format(g.createdAt, "dd/MM", { locale: ptBR });
    if (!rsvpByDate[d]) rsvpByDate[d] = { confirmed: 0, declined: 0 };
    if (g.rsvpStatus === "CONFIRMED") rsvpByDate[d].confirmed++;
    if (g.rsvpStatus === "DECLINED") rsvpByDate[d].declined++;
  }
  const rsvpData = Object.entries(rsvpByDate).map(([date, v]) => ({ date, ...v }));

  // Top photos by reactions
  const topPhotos = photos
    .map((p) => ({ id: p.id, caption: p.caption ?? "Sem legenda", reactions: p.reactions.length }))
    .sort((a, b) => b.reactions - a.reactions)
    .slice(0, 5);

  // Top songs by votes
  const topSongs = songs
    .map((s) => ({ id: s.id, name: `${s.trackName} — ${s.artist ?? "?"}`, votes: s.votes.length }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  const daysLeft = Math.ceil(
    (event.ceremonyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Analytics" eventId={eventId} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-6">Analytics do evento</h1>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <KpiCard label="Confirmados" value={confirmed.length} sub={`${totalPeople} pessoas`} />
          <KpiCard label="Recusados" value={declined.length} />
          <KpiCard label="Pendentes" value={pending.length} />
          <KpiCard label="Dias para o evento" value={daysLeft > 0 ? daysLeft : 0} sub={daysLeft <= 0 ? "Hoje!" : undefined} highlight={daysLeft <= 7} />
        </div>

        {/* RSVP Chart */}
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Confirmações ao longo do tempo</h2>
          {rsvpData.length > 0 ? (
            <div className="border rounded-xl p-4">
              <RsvpChart data={rsvpData} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          )}
        </section>

        {/* Top photos */}
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Fotos mais reagidas</h2>
          {topPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem fotos aprovadas ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topPhotos.map((p, i) => (
                <RankRow key={p.id} rank={i + 1} label={p.caption} value={`${p.reactions} reações`} />
              ))}
            </div>
          )}
        </section>

        {/* Top songs */}
        <section>
          <h2 className="text-base font-semibold mb-3">Músicas mais votadas</h2>
          {topSongs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem músicas aprovadas ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topSongs.map((s, i) => (
                <RankRow key={s.id} rank={i + 1} label={s.name} value={`${s.votes} voto${s.votes !== 1 ? "s" : ""}`} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function KpiCard({ label, value, sub, highlight }: { label: string; value: number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${highlight ? "border-orange-300 bg-orange-50" : "bg-muted/30"}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-orange-700" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function RankRow({ rank, label, value }: { rank: number; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border rounded-lg px-4 py-3">
      <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">#{rank}</span>
      <span className="flex-1 text-sm truncate">{label}</span>
      <span className="text-xs text-muted-foreground shrink-0">{value}</span>
    </div>
  );
}
