import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { RsvpForm } from "@/components/guest/rsvp-form";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rsvp");
  return { title: t("title") };
}

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;

  const [result, t] = await Promise.all([
    validateEventAccess(slug, k ?? null),
    getTranslations("rsvp"),
  ]);
  if (!result.ok) notFound();

  const { event, guest } = result;

  const companions = guest
    ? await prisma.guestCompanion.findMany({
        where: { guestId: guest.id },
        select: { name: true, type: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          {guest?.rsvpStatus === "CONFIRMED"
            ? "Atualizar confirmação"
            : t("title")}
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          {event.coupleNames} aguardam você ✨
        </p>
      </div>

      <RsvpForm
        slug={slug}
        k={k}
        initialData={
          guest
            ? {
                name: guest.name,
                emailAddr: guest.email,
                phone: guest.phone ?? "",
                plusOnes: guest.plusOnes,
                dietaryRestrictions: guest.dietaryRestrictions ?? "",
                message: guest.message ?? "",
                rsvpStatus: guest.rsvpStatus as "CONFIRMED" | "DECLINED",
                companions: companions.map((c) => ({ name: c.name, type: c.type })),
              }
            : undefined
        }
        rsvpEarlyDeadline={event.rsvpEarlyDeadline}
      />
    </div>
  );
}
