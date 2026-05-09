import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
}

export default async function PresenteSucessoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { d: donationId } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { coupleNames: true },
  });
  if (!event) notFound();

  const donation = donationId
    ? await prisma.donation.findUnique({
        where: { id: donationId },
        select: { amount: true, gift: { select: { name: true } }, status: true },
      })
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-5xl">🎁</div>
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--theme-font-heading)" }}>
        {donation?.status === "PAID" ? "Pagamento confirmado!" : "Pedido recebido!"}
      </h1>
      {donation && (
        <p className="text-sm text-[var(--theme-secondary)] max-w-xs">
          {donation.gift?.name && `Presente: ${donation.gift.name}. `}
          {donation.status === "PAID"
            ? "O casal foi notificado da sua doação."
            : "Assim que o pagamento for confirmado, o casal será notificado."}
        </p>
      )}
      <p className="text-sm text-[var(--theme-secondary)]">
        Obrigado! O casal de {event.coupleNames} agradece.
      </p>
      <Link
        href={`/${slug}/presentes`}
        className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-[var(--theme-muted)] transition-colors"
      >
        Voltar para presentes
      </Link>
    </div>
  );
}
