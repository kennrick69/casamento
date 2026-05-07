import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addJourneyItem, deleteJourneyItem, reorderJourneyItems } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Roteiro" };

export default async function RoteiroAdminPage({
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
    select: { coupleNames: true, slug: true },
  });
  if (!event) notFound();

  const items = await prisma.journeyItem.findMany({
    where: { eventId: id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={id} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Roteiro do dia</h2>
          <a
            href={`/${event.slug}/roteiro`}
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            Ver página ↗
          </a>
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-2 mb-8">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="bg-background border border-border rounded-lg px-4 py-3 flex items-start gap-3"
              >
                <div className="flex flex-col gap-0.5 mt-1">
                  <form action={reorderJourneyItems}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="eventId" value={id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      className="block text-muted-foreground disabled:opacity-20 hover:text-foreground text-xs"
                    >
                      ▲
                    </button>
                  </form>
                  <form action={reorderJourneyItems}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="eventId" value={id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={i === items.length - 1}
                      className="block text-muted-foreground disabled:opacity-20 hover:text-foreground text-xs"
                    >
                      ▼
                    </button>
                  </form>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{item.time}</p>
                  <p className="font-semibold">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.location && (
                    <p className="text-xs text-muted-foreground">📍 {item.location}</p>
                  )}
                </div>
                <form action={deleteJourneyItem}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="eventId" value={id} />
                  <button
                    type="submit"
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remover
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div className="bg-background border border-border rounded-lg p-5">
          <h3 className="font-medium mb-4">Adicionar item</h3>
          <form action={addJourneyItem} className="flex flex-col gap-3">
            <input type="hidden" name="eventId" value={id} />
            <input type="hidden" name="order" value={items.length} />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="time">Horário</Label>
                <Input id="time" name="time" placeholder="16:00" required className="h-10 font-mono" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">Local (opcional)</Label>
                <Input id="location" name="location" placeholder="Capela" className="h-10" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" placeholder="Chegada dos convidados" required className="h-10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea id="description" name="description" placeholder="Detalhes adicionais..." rows={2} />
            </div>
            <Button type="submit" className="h-10">Adicionar item</Button>
          </form>
        </div>
      </main>
    </div>
  );
}
