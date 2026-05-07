import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { notFound } from "next/navigation";
import { CheckinForm } from "./checkin-form";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}

export default async function CheckinPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { code } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, features: true },
  });
  if (!event) notFound();

  const features = event.features as Record<string, boolean>;
  if (!features.gamification) notFound();

  const guest = await getCurrentGuest(slug);

  return (
    <div className="px-4 pt-5 pb-24 max-w-sm mx-auto">
      <Link
        href={`/${slug}/gincana`}
        className="text-xs text-[var(--theme-secondary)] mb-4 inline-block"
      >
        ← Gincana
      </Link>

      <h1
        className="text-xl font-semibold mb-1"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Check-in
      </h1>
      <p className="text-sm text-[var(--theme-secondary)] mb-6">
        Digite o código distribuído no evento para ganhar seus pontos.
      </p>

      {guest ? (
        <CheckinForm slug={slug} initialCode={code} />
      ) : (
        <div className="text-sm text-[var(--theme-secondary)] text-center py-6">
          <Link href={`/${slug}/rsvp`} className="underline font-medium">
            Confirme sua presença
          </Link>{" "}
          para fazer check-in.
        </div>
      )}
    </div>
  );
}
