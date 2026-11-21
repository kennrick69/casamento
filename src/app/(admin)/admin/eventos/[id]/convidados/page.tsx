import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EXCLUDE_VISITORS } from "@/lib/guest-filters";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { GuestList, type InviteRow } from "./guest-list";
import { ensurePersonalCodes } from "@/lib/invite/codes";
import { getInviteBase, assembleInviteContext } from "@/lib/invite/context";
import { buildInviteText, buildWhatsappHref } from "@/lib/invite/message";
import { formatCode } from "@/lib/invite/codes";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Convidados" };

export default async function ConvidadosPage({
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
    select: {
      coupleNames: true,
      slug: true,
      ceremonyDate: true,
      timezone: true,
      publicTokenK: true,
      experienceType: true,
      ceremonyLocation: true,
      ceremonyAddress: true,
      mapsLink: true,
    },
  });
  if (!event) notFound();

  const guests = await prisma.guest.findMany({
    where: { eventId: id, deletedAt: null, ...EXCLUDE_VISITORS },
    orderBy: [{ rsvpStatus: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      plusOnes: true,
      dietaryRestrictions: true,
      rsvpStatus: true,
      banned: true,
      createdAt: true,
    },
  });

  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED");
  const totalWithCompanions = confirmed.reduce((sum, g) => sum + 1 + g.plusOnes, 0);

  // ── S4a · Códigos de convite (só no Modo Gamificado) ─────────────────────
  // O código pessoal leva ao jogo (resgate /<slug>/c/<code>), que só existe em
  // eventos GAMIFIED. Evento CLASSIC mantém o link simples de RSVP.
  const gamified = event.experienceType === "GAMIFIED";
  const inviteRows: Record<string, InviteRow> = {};
  if (gamified) {
    // Backfill: garante um código PESSOAL para TODO convidado existente (não só
    // os novos). Idempotente; não toca em sessionToken/cookie nem no link ?k=.
    const codeByGuest = await ensurePersonalCodes(id);
    const inviteCodeRows = await prisma.inviteCode.findMany({
      where: { eventId: id, kind: "PERSONAL" },
      select: { guestId: true, sentAt: true, sentChannel: true },
    });
    const sentByGuest = new Map(inviteCodeRows.map((r) => [r.guestId, r] as const));

    const inviteBase = await getInviteBase({
      id,
      slug: event.slug,
      coupleNames: event.coupleNames,
      ceremonyDate: event.ceremonyDate,
      timezone: event.timezone,
      ceremonyLocation: event.ceremonyLocation,
      ceremonyAddress: event.ceremonyAddress,
      mapsLink: event.mapsLink,
    });

    for (const g of guests) {
      const code = codeByGuest.get(g.id);
      if (!code) continue;
      const ctx = assembleInviteContext(inviteBase, g.name, code);
      const sent = sentByGuest.get(g.id);
      inviteRows[g.id] = {
        code: formatCode(code),
        personalLink: ctx.personalLink,
        whatsappHref: g.phone ? buildWhatsappHref(g.phone, buildInviteText(ctx)) : null,
        sentAt: sent?.sentAt ? sent.sentAt.toISOString() : null,
        sentChannel: (sent?.sentChannel as "whatsapp" | "email" | null) ?? null,
      };
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://casamento.app";

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} eventId={id} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={id} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">
              {guests.length} convidado{guests.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              {confirmed.length} confirmados · {totalWithCompanions} pessoas incluindo acompanhantes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {gamified && (
              <a
                href={`/admin/eventos/${id}/convites`}
                className="text-sm text-primary hover:underline"
              >
                Convites impressos
              </a>
            )}
            <a
              href={`/admin/eventos/${id}/convidados/importar`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Importar planilha
            </a>
            <a
              href={`/api/admin/eventos/${id}/convidados/export`}
              className="text-sm text-primary hover:underline"
            >
              Exportar CSV
            </a>
          </div>
        </div>

        <GuestList
          guests={guests}
          eventId={id}
          gamified={gamified}
          inviteRows={inviteRows}
          whatsappContext={
            gamified
              ? undefined
              : {
                  coupleNames: event.coupleNames,
                  slug: event.slug,
                  ceremonyDate: event.ceremonyDate.toISOString(),
                  timezone: event.timezone,
                  publicTokenK: event.publicTokenK,
                  appUrl,
                }
          }
        />
      </main>
    </div>
  );
}
