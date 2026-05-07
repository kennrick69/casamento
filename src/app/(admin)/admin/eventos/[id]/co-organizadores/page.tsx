import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { inviteCoOrganizer, removeCoOrganizer } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Co-organizadores" };

export default async function CoOrganizadoresPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  let myRole: string;
  try {
    const auth = await requireOrganizer(id);
    myRole = auth.role;
  } catch {
    notFound();
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { coupleNames: true },
  });
  if (!event) notFound();

  const organizers = await prisma.eventOrganizer.findMany({
    where: { eventId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title={event.coupleNames} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={id} />

        <h2 className="text-lg font-semibold mb-6">Co-organizadores</h2>

        <div className="flex flex-col gap-2 mb-8">
          {organizers.map((o) => (
            <div
              key={o.userId}
              className="bg-background border border-border rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{o.user.name}</p>
                <p className="text-sm text-muted-foreground">{o.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground capitalize">{o.role.toLowerCase()}</span>
                {myRole === "OWNER" && o.userId !== session?.user?.id && o.role !== "OWNER" && (
                  <form action={removeCoOrganizer}>
                    <input type="hidden" name="eventId" value={id} />
                    <input type="hidden" name="userId" value={o.userId} />
                    <button type="submit" className="text-xs text-red-400 hover:text-red-600 transition-colors">
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>

        {myRole === "OWNER" && (
          <div className="bg-background border border-border rounded-lg p-5">
            <h3 className="font-medium mb-1">Convidar co-organizador</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A pessoa receberá um link de acesso por email. Quando entrar, será adicionada como editor deste evento.
            </p>
            <form action={inviteCoOrganizer} className="flex flex-col gap-3">
              <input type="hidden" name="eventId" value={id} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email do co-organizador</Label>
                <Input id="email" name="email" type="email" required placeholder="parceiro@email.com" className="h-11" />
              </div>
              <Button type="submit" className="h-11">Enviar convite</Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
