import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { MassEmailForm } from "./mass-email-form";
import { DigestForm } from "./digest-form";
import { formatEventDate } from "@/lib/timezone";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NotificacoesPage({ params }: Props) {
  const { id: eventId } = await params;

  let userId: string;
  try {
    const result = await requireOrganizer(eventId);
    userId = result.userId;
  } catch {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) notFound();

  const [event, organizer] = await Promise.all([
    prisma.event.findUnique({
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
    }),
    prisma.eventOrganizer.findUnique({
      where: { eventId_userId: { eventId, userId: session.user.id } },
      select: { digestFrequency: true },
    }),
  ]);
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

        {/* Automatic reminders */}
        <section className="mb-8 border rounded-lg p-4 bg-muted/40">
          <h2 className="text-base font-semibold mb-2">Lembretes automáticos</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Convidados confirmados recebem um email automático 7 dias e 1 dia antes do casamento ({dateLabel}).
          </p>
          <p className="text-xs text-muted-foreground">
            O envio usa chave de idempotência — cada convidado recebe no máximo uma vez por prazo.
          </p>
        </section>

        {/* Digest frequency */}
        <section className="mb-8 border rounded-lg p-4">
          <h2 className="text-base font-semibold mb-1">Resumo por email (digest)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Receba um resumo com novas confirmações, fotos pendentes e mensagens sinalizadas.
          </p>
          <DigestForm
            eventId={eventId}
            current={organizer?.digestFrequency ?? "NONE"}
          />
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
