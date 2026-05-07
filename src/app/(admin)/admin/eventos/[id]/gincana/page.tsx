import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { seedDefaultMissions } from "@/lib/points";
import { toggleMission, createCheckinCode, toggleCheckinCode } from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GincanaAdminPage({ params }: Props) {
  const { id: eventId } = await params;

  try { await requireOrganizer(eventId); } catch { notFound(); }

  // Ensure missions exist (handles events created before Fase 4)
  await seedDefaultMissions(eventId);

  const [missions, checkinCodes, ranking] = await Promise.all([
    prisma.mission.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
    }),
    prisma.checkinCode.findMany({
      where: { eventId },
      orderBy: { code: "asc" },
      include: { mission: { select: { title: true, points: true } } },
    }),
    prisma.guestPoints.findMany({
      where: { eventId },
      orderBy: { totalPoints: "desc" },
      take: 10,
      include: { guest: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Gincana" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />

        <h1 className="text-2xl font-bold mb-6">Gincana</h1>

        {/* Ranking */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Ranking atual</h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ponto registrado ainda.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">Convidado</th>
                    <th className="text-right px-4 py-2 font-medium">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((entry, i) => (
                    <tr key={entry.guestId} className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2">{entry.guest.name}</td>
                      <td className="px-4 py-2 text-right font-bold">{entry.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Missions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Missões</h2>
          <div className="flex flex-col gap-2">
            {missions.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.points} pts
                    {m.dailyCap ? ` · até ${m.dailyCap}× por dia` : ""}
                  </p>
                </div>
                <form action={toggleMission}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="missionId" value={m.id} />
                  <input type="hidden" name="active" value={String(m.active)} />
                  <button
                    type="submit"
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      m.active
                        ? "border-green-500 text-green-700 bg-green-50 hover:bg-green-100"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {m.active ? "Ativa" : "Inativa"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* Check-in Codes */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Códigos de check-in</h2>

          <form action={createCheckinCode} className="flex flex-col gap-3 border rounded-lg p-4 mb-4 bg-muted/40">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Código</label>
                <input
                  name="code"
                  required
                  placeholder="CERIMONIA"
                  maxLength={20}
                  className="border rounded px-3 py-2 text-sm font-mono uppercase bg-background"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Descrição</label>
                <input
                  name="purpose"
                  placeholder="Check-in cerimônia"
                  maxLength={60}
                  className="border rounded px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Missão associada (opcional)</label>
              <select name="missionId" className="border rounded px-3 py-2 text-sm bg-background">
                <option value="">— Sem pontos —</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} (+{m.points} pts)
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="self-start text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Criar código
            </button>
          </form>

          {checkinCodes.length > 0 && (
            <div className="flex flex-col gap-2">
              {checkinCodes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-sm">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.purpose}
                      {c.mission ? ` · +${c.mission.points} pts` : ""}
                    </p>
                  </div>
                  <form action={toggleCheckinCode}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="codeId" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button
                      type="submit"
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        c.active
                          ? "border-green-500 text-green-700 bg-green-50 hover:bg-green-100"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {c.active ? "Ativo" : "Inativo"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
