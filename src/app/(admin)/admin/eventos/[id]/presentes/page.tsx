import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { createGift, deleteGift, toggleFulfilled } from "./actions";

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

        {/* Add gift */}
        <form action={createGift} className="flex flex-col gap-3 border rounded-lg p-4 mb-6 bg-muted/40">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-medium">Nome *</label>
              <input name="name" required maxLength={120} placeholder="Jogo de panelas" className="border rounded px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Preço estimado (R$)</label>
              <input name="price" type="number" min="0" step="0.01" placeholder="450.00" className="border rounded px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Link (opcional)</label>
              <input name="externalLink" type="url" placeholder="https://..." className="border rounded px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-medium">Descrição (opcional)</label>
              <input name="description" maxLength={300} placeholder="Conjunto 5 peças antiaderente" className="border rounded px-3 py-2 text-sm bg-background" />
            </div>
          </div>
          <button type="submit" className="self-start text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Adicionar presente
          </button>
        </form>

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
              <div className="flex gap-1 shrink-0">
                <form action={toggleFulfilled}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="giftId" value={gift.id} />
                  <input type="hidden" name="fulfilled" value={String(gift.fulfilled)} />
                  <button type="submit" className={`text-xs px-2 py-1 rounded border transition-colors ${gift.fulfilled ? "border-green-500 text-green-700 bg-green-50" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {gift.fulfilled ? "Recebido" : "Marcar recebido"}
                  </button>
                </form>
                {!gift.reservedByGuestId && (
                  <form action={deleteGift}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="giftId" value={gift.id} />
                    <button type="submit" className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      Remover
                    </button>
                  </form>
                )}
              </div>
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
