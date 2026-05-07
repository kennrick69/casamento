import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
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

  const [totalGuests, confirmedGuests, declinedGuests, pendingGuests, totalPhotos] =
    await Promise.all([
      prisma.guest.count({ where: { eventId: id, deletedAt: null } }),
      prisma.guest.count({ where: { eventId: id, rsvpStatus: "CONFIRMED", deletedAt: null } }),
      prisma.guest.count({ where: { eventId: id, rsvpStatus: "DECLINED", deletedAt: null } }),
      prisma.guest.count({ where: { eventId: id, rsvpStatus: "PENDING", deletedAt: null } }),
      prisma.photo.count({ where: { eventId: id } }),
    ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/${event.slug}`;
  const qrPng = `/api/qr/${event.slug}`;

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={id} />

        {event.status === "DRAFT" && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-yellow-800">
              Este evento está em rascunho. Conclua a configuração para publicar.
            </p>
            <Link
              href={`/admin/eventos/${id}/configuracoes?step=2`}
              className={buttonVariants({ variant: "outline" })}
            >
              Continuar wizard
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <StatCard label="Total" value={totalGuests} />
          <StatCard label="Confirmados" value={confirmedGuests} color="green" />
          <StatCard label="Recusados" value={declinedGuests} color="red" />
          <StatCard label="Pendentes" value={pendingGuests} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Data">
            <p className="font-medium">
              {format(event.ceremonyDate, "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </InfoCard>

          <InfoCard title="Status">
            <span
              className={`text-sm px-2 py-0.5 rounded-full ${
                event.status === "PUBLISHED"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {event.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
            </span>
          </InfoCard>

          <InfoCard title="Link do convite">
            <p className="font-mono text-sm break-all">{eventUrl}</p>
            <div className="flex gap-2 mt-2">
              <a
                href={eventUrl}
                target="_blank"
                className="text-xs text-primary hover:underline"
              >
                Abrir ↗
              </a>
              <a href={qrPng} download className="text-xs text-primary hover:underline">
                Baixar QR PNG
              </a>
              <a href={`${qrPng}?format=svg`} download className="text-xs text-primary hover:underline">
                Baixar QR SVG
              </a>
            </div>
          </InfoCard>

          <InfoCard title="Fotos enviadas">
            <p className="font-medium">{totalPhotos}</p>
          </InfoCard>
        </div>
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
  color?: "green" | "red";
}) {
  return (
    <div className="bg-background rounded-lg border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-2xl font-bold tabular-nums ${
          color === "green"
            ? "text-green-700"
            : color === "red"
            ? "text-red-600"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background rounded-lg border border-border px-4 py-4">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}
