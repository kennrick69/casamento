import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { AddGiftForm } from "./add-gift-form";
import { GiftItemActions } from "./gift-item-actions";

interface Props { params: Promise<{ id: string }> }

export default async function PresentesAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { pixKey: true, gifts: { orderBy: { name: "asc" } } },
  });
  if (!event) notFound();

  const gifts = event.gifts;
  const reserved = gifts.filter((g) => g.reservedByGuestId);
  const fulfilled = gifts.filter((g) => g.fulfilled);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Presentes" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-2">Lista de presentes</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {gifts.length} itens · {reserved.length} reservados · {fulfilled.length} recebidos
        </p>

        <AddGiftForm eventId={eventId} />

        {/* Gift list */}
        <div className="flex flex-col gap-2">
          {gifts.map((gift) => (
            <div key={gift.id} className="border rounded-lg px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${gift.fulfilled ? "line-through text-muted-foreground" : ""}`}>{gift.name}</p>
                {gift.description && <p className="text-xs text-muted-foreground">{gift.description}</p>}
                {gift.price && <p className="text-xs text-muted-foreground">R$ {gift.price.toFixed(2)}</p>}
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
      </main>
    </div>
  );
}
