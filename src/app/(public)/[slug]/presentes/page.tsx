import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { DonationButton } from "./donation-button";
import { safeHref } from "@/lib/utils/safe-href";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Presentes" };

export default async function PresentesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string; mp?: string }>;
}) {
  const { slug } = await params;
  const { k, mp } = await searchParams;

  const result = await validateEventAccess(slug, k ?? null);
  if (!result.ok) notFound();

  const { event, guest } = result;

  const features = event.features as Record<string, boolean>;
  if (features.donations === false) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <p className="text-[var(--theme-secondary)] text-sm mt-8">
          Lista de presentes não disponível.
        </p>
      </div>
    );
  }

  const gifts = await prisma.gift.findMany({
    where: { eventId: event.id },
    orderBy: [{ fulfilled: "asc" }, { price: "asc" }],
    include: {
      reserver: { select: { name: true } },
      donations: guest
        ? { where: { guestId: guest.id }, select: { id: true, status: true, amount: true }, take: 1 }
        : undefined,
    },
  });

  const donationMode = event.donationMode;
  const pixKey = event.pixKey;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: "var(--theme-font-heading)" }}>
          Lista de presentes
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          {donationMode === "MERCADO_PAGO"
            ? "Presenteie com cartão ou PIX instantâneo — confirmação automática!"
            : "Escolha um presente e reserve. Qualquer valor é bem-vindo!"}
        </p>
      </div>

      {mp === "fail" && (
        <div className="rounded-[var(--theme-radius)] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          O pagamento não foi concluído. Tente novamente.
        </div>
      )}
      {mp === "pending" && (
        <div className="rounded-[var(--theme-radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Pagamento em análise. Avisaremos por email quando confirmado.
        </div>
      )}

      {pixKey && donationMode !== "MERCADO_PAGO" && (
        <div className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3">
          <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-1">Chave PIX</p>
          <p className="font-mono text-sm break-all select-all">{pixKey}</p>
          {donationMode === "PIX_PROOF" && (
            <p className="text-xs text-[var(--theme-secondary)] mt-1">
              Faça o PIX e envie o comprovante clicando em cada presente abaixo.
            </p>
          )}
        </div>
      )}

      {gifts.length === 0 ? (
        <p className="text-sm text-[var(--theme-secondary)]">A lista de presentes ainda não foi publicada.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {gifts.map((gift) => {
            const isReservedByMe = guest && gift.reservedByGuestId === guest.id;
            const isReservedByOther = gift.reservedByGuestId && !isReservedByMe;
            const myDonation = gift.donations?.[0] ?? null;

            return (
              <div
                key={gift.id}
                className={`rounded-[var(--theme-radius)] border px-4 py-4 flex flex-col gap-2 border-[var(--theme-border)] ${gift.fulfilled ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{gift.name}</p>
                    {gift.description && (
                      <p className="text-sm text-[var(--theme-secondary)]">{gift.description}</p>
                    )}
                    {gift.price != null && (
                      <p className="text-sm font-medium mt-0.5">
                        R$ {gift.price.toFixed(2).replace(".", ",")}
                      </p>
                    )}
                  </div>
                  {gift.externalLink && (
                    <a
                      href={safeHref(gift.externalLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--theme-primary)] hover:underline shrink-0"
                    >
                      Ver ↗
                    </a>
                  )}
                </div>

                {gift.fulfilled ? (
                  <p className="text-xs text-[var(--theme-secondary)]">Já presenteado ✓</p>
                ) : myDonation ? (
                  <DonationStatusBadge status={myDonation.status} />
                ) : isReservedByOther ? (
                  <p className="text-xs text-[var(--theme-secondary)]">
                    Reservado por {gift.reserver?.name ?? "alguém"}
                  </p>
                ) : guest ? (
                  donationMode === "MERCADO_PAGO" ? (
                    <DonationButton
                      giftId={gift.id}
                      slug={slug}
                      mode="MERCADO_PAGO"
                      amount={gift.price ?? 0}
                    />
                  ) : donationMode === "PIX_PROOF" ? (
                    <DonationButton
                      giftId={gift.id}
                      slug={slug}
                      mode="PIX_PROOF"
                      amount={gift.price ?? 0}
                    />
                  ) : (
                    // TRUST mode: show ReserveButton (existing behavior) + declare donation
                    <DonationButton
                      giftId={gift.id}
                      slug={slug}
                      mode="TRUST"
                      amount={gift.price ?? 0}
                      reserved={!!isReservedByMe}
                    />
                  )
                ) : (
                  <p className="text-xs text-[var(--theme-secondary)]">
                    <a href={`/${slug}/rsvp`} className="underline">Confirme sua presença</a> para presentear
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DonationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    DECLARED: { label: "Promessa registrada", color: "text-blue-600 bg-blue-50" },
    PROOF_UPLOADED: { label: "Comprovante enviado — aguardando aprovação", color: "text-amber-700 bg-amber-50" },
    APPROVED: { label: "Confirmado pelo casal ✓", color: "text-green-700 bg-green-50" },
    PAID: { label: "Pagamento confirmado ✓", color: "text-green-700 bg-green-50" },
    REJECTED: { label: "Rejeitado", color: "text-destructive bg-destructive/10" },
  };
  const { label, color } = map[status] ?? { label: status, color: "text-muted-foreground" };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${color}`}>{label}</span>
  );
}
