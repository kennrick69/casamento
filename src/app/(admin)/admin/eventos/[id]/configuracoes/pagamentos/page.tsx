import { getAppUrl } from "@/lib/app-url";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { canEncrypt } from "@/lib/crypto/secrets";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { PagamentosClient } from "./pagamentos-client";

export const metadata: Metadata = { title: "Configuração de Pagamentos" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PagamentosPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      coupleNames: true,
      donationMode: true,
      pixKey: true,
      mpEnabled: true,
      mpWebhookSecret: true,
      mpAccessToken: true,
    },
  });
  if (!event) notFound();

  const canEnc = canEncrypt();
  const validModes = ["TRUST", "PIX_PROOF", "MERCADO_PAGO"] as const;
  type ValidMode = typeof validModes[number];
  const currentMode: ValidMode = validModes.includes(event.donationMode as ValidMode)
    ? (event.donationMode as ValidMode)
    : "TRUST";

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} eventId={eventId} backHref={`/admin/eventos/${eventId}/configuracoes`} />
      <EventNav eventId={eventId} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Configuração de Pagamentos</h1>
          <p className="text-sm text-muted-foreground">
            Escolha como os convidados podem presentear via o app.
          </p>
        </div>

        <PagamentosClient
          eventId={eventId}
          currentMode={currentMode}
          currentPixKey={event.pixKey ?? ""}
          currentWebhookSecret={event.mpWebhookSecret ?? ""}
          hasMpConfigured={!!event.mpAccessToken}
          canEncrypt={canEnc}
          appUrl={getAppUrl()}
        />
      </main>
    </div>
  );
}
