import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { resolveCardapio } from "@/lib/game/cardapio";
import { CardapioClient } from "./cardapio-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cardápio do Garçom" };

interface Props { params: Promise<{ id: string }> }

export default async function CardapioAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();

  const resolved = resolveCardapio(event.menu);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Cardápio do Garçom" eventId={eventId} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-2">Cardápio do Garçom</h1>
        <p className="text-sm text-muted-foreground mb-6">
          No Grande Dia, o <strong>Garçom</strong> mostra este cardápio quando o convidado fala com ele.
          Enquanto você não cadastrar, ele mostra um cardápio de <strong>exemplo</strong>.
        </p>
        <CardapioClient
          eventId={eventId}
          isExample={resolved.isExample}
          foods={resolved.isExample ? [] : resolved.foods}
          drinks={resolved.isExample ? [] : resolved.drinks}
          byoNotice={resolved.isExample ? "" : resolved.byoNotice}
          tableFoundMessage={event.tableFoundMessage ?? ""}
          exampleFoods={resolved.foods}
          exampleDrinks={resolved.drinks}
        />
      </main>
    </div>
  );
}
