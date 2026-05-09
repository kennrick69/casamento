import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { MassEmailForm } from "./mass-email-form";
import { formatEventDate } from "@/lib/timezone";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NotificacoesPage({ params }: Props) {
  const { id: eventId } = await params;

  try { await requireOrganizer(eventId); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      ceremonyDate: true,
      timezone: true,
      guests: {
        where: { deletedAt: null, banned: false },
        select: { id: true, rsvpStatus: true, email: true },
      },
    },
  });
  if (!event) notFound();

  const confirmedGuests = event.guests.filter((g) => g.rsvpStatus === "CONFIRMED" && g.email);
  const allWithEmail = event.guests.filter((g) => g.email);

  const dateLabel = formatEventDate(
    event.ceremonyDate,
    event.timezone,
    "EEEE, d 'de' MMMM 'de' yyyy"
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Notificações" eventId={eventId} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />

        <h1 className="text-2xl font-bold mb-6">Notificações</h1>

        {/* Reminder info */}
        <section className="mb-8 border rounded-lg p-4 bg-muted/40">
          <h2 className="text-base font-semibold mb-2">Lembretes automáticos</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Convidados confirmados recebem um email automático 7 dias e 1 dia antes do casamento ({dateLabel}).
          </p>
          <p className="text-xs text-muted-foreground">
            O envio usa chave de idempotência — cada convidado recebe no máximo uma vez por prazo.
          </p>
        </section>

        {/* Mass email */}
        <section>
          <h2 className="text-base font-semibold mb-4">Enviar mensagem personalizada</h2>
          <MassEmailForm
            eventId={eventId}
            confirmedCount={confirmedGuests.length}
            totalCount={allWithEmail.length}
          />
        </section>
      </main>
    </div>
  );
}
