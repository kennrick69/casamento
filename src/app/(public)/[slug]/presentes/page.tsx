import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { ReserveButton } from "./reserve-button";
import { safeHref } from "@/lib/utils/safe-href";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Presentes" };

export default async function PresentesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;

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
    include: { reserver: { select: { name: true } } },
  });

  const pixKey = event.pixKey;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <div>
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          Lista de presentes
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          Escolha um presente e reserve. Qualquer valor é bem-vindo!
        </p>
      </div>

      {pixKey && (
        <div className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3">
          <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-1">
            PIX
          </p>
          <p className="font-mono text-sm break-all select-all">{pixKey}</p>
          <p className="text-xs text-[var(--theme-secondary)] mt-1">
            Chave PIX para transferências livres
          </p>
        </div>
      )}

      {gifts.length === 0 ? (
        <p className="text-sm text-[var(--theme-secondary)]">
          A lista de presentes ainda não foi publicada.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {gifts.map((gift) => {
            const isReservedByMe = guest && gift.reservedByGuestId === guest.id;
            const isReservedByOther =
              gift.reservedByGuestId && !isReservedByMe;
            return (
              <div
                key={gift.id}
                className={`rounded-[var(--theme-radius)] border px-4 py-4 flex flex-col gap-2 ${
                  gift.fulfilled
                    ? "border-[var(--theme-border)] opacity-60"
                    : "border-[var(--theme-border)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{gift.name}</p>
                    {gift.description && (
                      <p className="text-sm text-[var(--theme-secondary)]">
                        {gift.description}
                      </p>
                    )}
                    {gift.price && (
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
                ) : isReservedByOther ? (
                  <p className="text-xs text-[var(--theme-secondary)]">
                    Reservado por {gift.reserver?.name ?? "alguém"}
                  </p>
                ) : guest ? (
                  <ReserveButton
                    giftId={gift.id}
                    slug={slug}
                    reserved={!!isReservedByMe}
                  />
                ) : (
                  <p className="text-xs text-[var(--theme-secondary)]">
                    <a href={`/${slug}/rsvp`} className="underline">
                      Confirme sua presença
                    </a>{" "}
                    para reservar
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
