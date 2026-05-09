import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { AddGiftForm } from "./add-gift-form";
import { GiftItemActions } from "./gift-item-actions";
import { DonationActions } from "./donation-actions";
import Link from "next/link";

interface Props { params: Promise<{ id: string }> }

const DONATION_STATUS_LABELS: Record<string, string> = {
  DECLARED: "Prometido",
  PROOF_UPLOADED: "Comprovante enviado",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  PAID: "Pago (MP)",
};

const DONATION_STATUS_COLORS: Record<string, string> = {
  DECLARED: "bg-blue-50 text-blue-700",
  PROOF_UPLOADED: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  PAID: "bg-green-50 text-green-700",
};

export default async function PresentesAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      coupleNames: true,
      donationMode: true,
      pixKey: true,
      gifts: { orderBy: { name: "asc" } },
    },
  });
  if (!event) notFound();

  const donations = await prisma.donation.findMany({
    where: { eventId },
    include: {
      guest: { select: { name: true, email: true } },
      gift: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const { gifts } = event;
  const reserved = gifts.filter((g) => g.reservedByGuestId);
  const fulfilled = gifts.filter((g) => g.fulfilled);
  const pendingDonations = donations.filter((d) => d.status === "PROOF_UPLOADED");

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Presentes" eventId={eventId} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Lista de presentes</h1>
          <Link
            href={`/admin/eventos/${eventId}/configuracoes/pagamentos`}
            className="text-xs text-primary underline underline-offset-2"
          >
            Configurar modo de pagamento →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          {gifts.length} itens · {reserved.length} reservados · {fulfilled.length} recebidos
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Modo atual: <strong>{event.donationMode === "MERCADO_PAGO" ? "Mercado Pago" : event.donationMode === "PIX_PROOF" ? "PIX + Comprovante" : "Confiança"}</strong>
        </p>

        <AddGiftForm eventId={eventId} />

        <div className="flex flex-col gap-2 mb-10">
          {gifts.map((gift) => (
            <div key={gift.id} className="border rounded-lg px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${gift.fulfilled ? "line-through text-muted-foreground" : ""}`}>
                  {gift.name}
                </p>
                {gift.description && <p className="text-xs text-muted-foreground">{gift.description}</p>}
                {gift.price && <p className="text-xs text-muted-foreground">R$ {gift.price.toFixed(2).replace(".", ",")}</p>}
                {gift.reservedByGuestId && !gift.fulfilled && (
                  <p className="text-xs text-amber-600 mt-0.5">Reservado</p>
                )}
              </div>
              <GiftItemActions
                eventId={eventId}
                giftId={gift.id}
                fulfilled={gift.fulfilled}
                reserved={!!gift.reservedByGuestId}
              />
            </div>
          ))}
          {gifts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum presente cadastrado.</p>
          )}
        </div>

        {/* Donations section */}
        {donations.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Doações recebidas</h2>
              {pendingDonations.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                  {pendingDonations.length} aguardando aprovação
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {donations.map((d) => (
                <div key={d.id} className="border rounded-lg px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{d.guest.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DONATION_STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground"}`}>
                        {DONATION_STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      R$ {d.amount.toFixed(2).replace(".", ",")}
                      {d.gift && ` · ${d.gift.name}`}
                    </p>
                    {d.guest.email && (
                      <p className="text-xs text-muted-foreground">{d.guest.email}</p>
                    )}
                  </div>
                  {(d.status === "PROOF_UPLOADED" || d.status === "DECLARED") && (
                    <DonationActions eventId={eventId} donationId={d.id} status={d.status} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
