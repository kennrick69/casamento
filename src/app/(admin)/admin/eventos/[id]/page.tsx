import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { format, formatDistanceToNow, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard do evento" };

export default async function EventDashboardPage({
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
    include: { theme: true },
  });
  if (!event) notFound();

  const [
    totalGuests,
    confirmedGuests,
    declinedGuests,
    pendingGuests,
    totalPhotos,
    pendingReports,
    recentGuests,
    recentPhotos,
    confirmedWithPlusOnes,
  ] = await Promise.all([
    prisma.guest.count({ where: { eventId: id, deletedAt: null } }),
    prisma.guest.count({ where: { eventId: id, rsvpStatus: "CONFIRMED", deletedAt: null } }),
    prisma.guest.count({ where: { eventId: id, rsvpStatus: "DECLINED", deletedAt: null } }),
    prisma.guest.count({ where: { eventId: id, rsvpStatus: "PENDING", deletedAt: null } }),
    prisma.photo.count({ where: { eventId: id } }),
    prisma.report.count({ where: { eventId: id, status: "PENDING" } }),
    prisma.guest.findMany({
      where: { eventId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, rsvpStatus: true, createdAt: true },
    }),
    prisma.photo.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true },
    }),
    prisma.guest.aggregate({
      where: { eventId: id, rsvpStatus: "CONFIRMED", deletedAt: null },
      _sum: { plusOnes: true },
    }),
  ]);

  const totalWithCompanions = confirmedGuests + (confirmedWithPlusOnes._sum.plusOnes ?? 0);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/${event.slug}`;
  const qrPng = `/api/qr/${event.slug}`;

  // Countdown
  const now = new Date();
  const daysLeft = differenceInCalendarDays(event.ceremonyDate, now);
  const countdownText =
    daysLeft > 0
      ? `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} para o grande dia`
      : daysLeft === 0
      ? "Hoje é o grande dia! 🎉"
      : `Celebrado há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? "s" : ""}`;

  // Recent activity: merge guests + photos sorted by date
  type ActivityItem =
    | { type: "guest"; id: string; name: string; rsvpStatus: string; createdAt: Date }
    | { type: "photo"; id: string; createdAt: Date };

  const activity: ActivityItem[] = [
    ...recentGuests.map((g) => ({ type: "guest" as const, ...g })),
    ...recentPhotos.map((p) => ({ type: "photo" as const, ...p })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={id} />

        {/* Draft banner */}
        {event.status === "DRAFT" && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-yellow-800">
              Este evento está em rascunho. Conclua a configuração para publicar.
            </p>
            <Link
              href={`/admin/eventos/${id}/configuracoes?step=2`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Continuar →
            </Link>
          </div>
        )}

        {/* Countdown */}
        <div className={`mb-6 rounded-xl px-5 py-4 text-center ${
          daysLeft > 0
            ? "bg-gradient-to-r from-rose-900 to-slate-900 text-white"
            : daysLeft === 0
            ? "bg-green-900 text-white"
            : "bg-muted border border-border"
        }`}>
          <p className={`text-3xl font-bold tabular-nums ${daysLeft <= 0 ? "text-foreground" : ""}`}>
            {daysLeft > 0 ? daysLeft : daysLeft === 0 ? "🎉" : Math.abs(daysLeft)}
          </p>
          <p className={`text-sm mt-1 ${daysLeft > 0 ? "text-white/70" : daysLeft === 0 ? "text-white/70" : "text-muted-foreground"}`}>
            {countdownText}
          </p>
          <p className={`text-xs mt-0.5 ${daysLeft > 0 ? "text-white/50" : "text-muted-foreground"}`}>
            {format(event.ceremonyDate, "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <StatCard label="Confirmados" value={confirmedGuests} sub={`${totalWithCompanions} c/ acomp.`} color="green" />
          <StatCard label="Recusados" value={declinedGuests} color="red" />
          <StatCard label="Pendentes" value={pendingGuests} />
          <StatCard label="Fotos" value={totalPhotos} />
        </div>

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <InfoCard title="Link do convite">
            <p className="font-mono text-xs break-all text-foreground/80">{eventUrl}</p>
            <div className="flex gap-3 mt-2 flex-wrap">
              <a href={eventUrl} target="_blank" className="text-xs text-primary hover:underline">
                Abrir ↗
              </a>
              <a href={qrPng} download className="text-xs text-primary hover:underline">
                QR PNG
              </a>
              <a href={`${qrPng}?format=svg`} download className="text-xs text-primary hover:underline">
                QR SVG
              </a>
            </div>
          </InfoCard>

          <InfoCard title="Status do evento">
            <div className="flex items-center justify-between">
              <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${
                event.status === "PUBLISHED"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {event.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
              </span>
              {pendingReports > 0 && (
                <Link
                  href={`/admin/eventos/${id}/moderacao`}
                  className="text-xs text-red-600 hover:underline font-medium"
                >
                  ⚠ {pendingReports} denúncia{pendingReports !== 1 ? "s" : ""}
                </Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalGuests} convidado{totalGuests !== 1 ? "s" : ""} cadastrado{totalGuests !== 1 ? "s" : ""}
            </p>
          </InfoCard>
        </div>

        {/* Recent activity */}
        {activity.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Atividade recente
            </h2>
            <div className="flex flex-col gap-1">
              {activity.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 bg-background border border-border rounded-lg text-sm"
                >
                  {item.type === "guest" ? (
                    <>
                      <span className="text-base">👤</span>
                      <span className="flex-1 truncate">
                        <span className="font-medium">{item.name}</span>{" "}
                        <span className={`text-xs ${
                          item.rsvpStatus === "CONFIRMED"
                            ? "text-green-700"
                            : item.rsvpStatus === "DECLINED"
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}>
                          {item.rsvpStatus === "CONFIRMED"
                            ? "confirmou"
                            : item.rsvpStatus === "DECLINED"
                            ? "recusou"
                            : "se cadastrou"}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-base">📷</span>
                      <span className="flex-1 text-muted-foreground">Nova foto enviada</span>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(item.createdAt, { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Gerenciar
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: `/admin/eventos/${id}/convidados`, label: "Convidados", icon: "👥" },
              { href: `/admin/eventos/${id}/mural`, label: "Mural", icon: "📷" },
              { href: `/admin/eventos/${id}/presentes`, label: "Presentes", icon: "🎁" },
              { href: `/admin/eventos/${id}/moderacao`, label: "Moderação", icon: pendingReports > 0 ? "⚠" : "🛡" },
              { href: `/admin/eventos/${id}/roteiro`, label: "Roteiro", icon: "📋" },
              { href: `/admin/eventos/${id}/playlist`, label: "Playlist", icon: "🎵" },
              { href: `/admin/eventos/${id}/lgpd`, label: "LGPD", icon: "🔒" },
              { href: `/admin/eventos/${id}/configuracoes`, label: "Config.", icon: "⚙" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-1.5 text-sm px-3 py-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                <span className="text-xl">{link.icon}</span>
                <span className="text-xs text-muted-foreground">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: "green" | "red";
}) {
  return (
    <div className="bg-background rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums leading-none mb-0.5 ${
        color === "green" ? "text-green-700" : color === "red" ? "text-red-600" : "text-foreground"
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background rounded-xl border border-border px-4 py-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}
