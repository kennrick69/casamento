import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { seedDefaultMissions } from "@/lib/points";
import { toggleMission, createCheckinCode, toggleCheckinCode, createCustomMission, deleteMission, deleteCheckinCode } from "./actions";
import { QRCode } from "./qr-code";

interface Props { params: Promise<{ id: string }> }

export default async function GincanaAdminPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  await seedDefaultMissions(eventId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [event, missions, checkinCodes, ranking] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } }),
    prisma.mission.findMany({ where: { eventId }, orderBy: { order: "asc" } }),
    prisma.checkinCode.findMany({
      where: { eventId },
      orderBy: { code: "asc" },
      include: { mission: { select: { title: true, points: true } } },
    }),
    prisma.guestPoints.findMany({
      where: { eventId },
      orderBy: { totalPoints: "desc" },
      include: { guest: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Gincana" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />

        <h1 className="text-2xl font-bold mb-6">Gincana</h1>

        {/* Full Ranking */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Ranking completo ({ranking.length})</h2>
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
                      <td className="px-4 py-2 text-muted-foreground font-mono">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
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
          <div className="flex flex-col gap-2 mb-4">
            {missions.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.points} pts{m.dailyCap ? ` · até ${m.dailyCap}× por dia` : ""}
                    {m.description ? ` · ${m.description}` : ""}
                    {m.code.startsWith("custom_") && <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">custom</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={toggleMission}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="missionId" value={m.id} />
                    <input type="hidden" name="active" value={String(m.active)} />
                    <button type="submit" className={`text-xs px-3 py-1 rounded-full border transition-colors ${m.active ? "border-green-500 text-green-700 bg-green-50" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {m.active ? "Ativa" : "Inativa"}
                    </button>
                  </form>
                  {m.code.startsWith("custom_") && (
                    <form action={deleteMission}>
                      <input type="hidden" name="eventId" value={eventId} />
                      <input type="hidden" name="missionId" value={m.id} />
                      <button type="submit" className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">✕</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Custom mission form */}
          <form action={createCustomMission} className="border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium mb-3">Criar missão personalizada</p>
            <input type="hidden" name="eventId" value={eventId} />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium">Título</label>
                <input name="title" required maxLength={100} placeholder="Dançou com o casal" className="border rounded px-3 py-2 text-sm bg-background" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Pontos</label>
                <input name="points" type="number" required min={1} max={9999} defaultValue={25} className="border rounded px-3 py-2 text-sm bg-background" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Máx. por dia (opcional)</label>
                <input name="dailyCap" type="number" min={1} className="border rounded px-3 py-2 text-sm bg-background" placeholder="—" />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium">Descrição (opcional)</label>
                <input name="description" maxLength={200} placeholder="Instruções para o convidado…" className="border rounded px-3 py-2 text-sm bg-background" />
              </div>
            </div>
            <button type="submit" className="text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Criar missão
            </button>
          </form>
        </section>

        {/* Check-in Codes with QR */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Códigos dos locais + QR</h2>

          <form action={createCheckinCode} className="flex flex-col gap-3 border rounded-lg p-4 mb-4 bg-muted/40">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Código</label>
                <input name="code" required placeholder="CERIMONIA" maxLength={20} className="border rounded px-3 py-2 text-sm font-mono uppercase bg-background" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Descrição</label>
                <input name="purpose" placeholder="Cerimônia" maxLength={60} className="border rounded px-3 py-2 text-sm bg-background" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Missão associada (opcional)</label>
              <select name="missionId" className="border rounded px-3 py-2 text-sm bg-background">
                <option value="">— Sem pontos —</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>{m.title} (+{m.points} pts)</option>
                ))}
              </select>
            </div>
            <button type="submit" className="self-start text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90">
              Criar código
            </button>
          </form>

          {checkinCodes.length > 0 && (
            <div className="flex flex-col gap-3">
              {checkinCodes.map((c) => {
                const checkinUrl = `${baseUrl}/${event?.slug}/checkin?code=${c.code}`;
                return (
                  <div key={c.id} className="border rounded-lg p-4 flex gap-4 items-start">
                    <QRCode value={checkinUrl} size={100} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm">{c.code}</p>
                      <p className="text-xs text-muted-foreground mb-1">
                        {c.purpose}
                        {c.mission ? ` · +${c.mission.points} pts` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono break-all mb-2">{checkinUrl}</p>
                      <div className="flex gap-2">
                        <form action={toggleCheckinCode}>
                          <input type="hidden" name="eventId" value={eventId} />
                          <input type="hidden" name="codeId" value={c.id} />
                          <input type="hidden" name="active" value={String(c.active)} />
                          <button type="submit" className={`text-xs px-3 py-1 rounded-full border ${c.active ? "border-green-500 text-green-700 bg-green-50" : "border-border text-muted-foreground hover:bg-muted"}`}>
                            {c.active ? "Ativo" : "Inativo"}
                          </button>
                        </form>
                        <form action={deleteCheckinCode}>
                          <input type="hidden" name="eventId" value={eventId} />
                          <input type="hidden" name="codeId" value={c.id} />
                          <button type="submit" className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Excluir</button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
