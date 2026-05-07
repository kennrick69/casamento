import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { resolveReport } from "./actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { params: Promise<{ id: string }> }

export default async function ModeracaoPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const reports = await prisma.report.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { name: true } },
      photo: { select: { id: true, storageKey: true } },
      chatMessage: { select: { id: true, content: true } },
    },
  });

  const pending = reports.filter((r) => r.status === "PENDING");
  const resolved = reports.filter((r) => r.status !== "PENDING");

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Moderação" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-2">Moderação</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {pending.length} denúncia{pending.length !== 1 ? "s" : ""} pendente{pending.length !== 1 ? "s" : ""}
        </p>

        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Nenhuma denúncia pendente.</p>
        )}

        {pending.map((report) => (
          <div key={report.id} className="border rounded-lg p-4 mb-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium">
                  {report.targetType === "PHOTO" ? "Foto" : "Mensagem"} denunciada
                </p>
                <p className="text-xs text-muted-foreground">
                  Por {report.reporter.name} · {format(report.createdAt, "d MMM yyyy", { locale: ptBR })}
                </p>
                {report.reason && <p className="text-xs mt-1 italic">&ldquo;{report.reason}&rdquo;</p>}
              </div>
            </div>
            {report.chatMessage && (
              <div className="bg-muted rounded p-3 text-sm mb-3 break-words">
                {report.chatMessage.content}
              </div>
            )}
            <div className="flex gap-2">
              <form action={resolveReport}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="reportId" value={report.id} />
                <input type="hidden" name="action" value="REMOVED" />
                {report.photoId && <input type="hidden" name="photoId" value={report.photoId} />}
                {report.chatMessageId && <input type="hidden" name="chatMessageId" value={report.chatMessageId} />}
                <button type="submit" className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors">
                  Remover conteúdo
                </button>
              </form>
              <form action={resolveReport}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="reportId" value={report.id} />
                <input type="hidden" name="action" value="DISMISSED" />
                <button type="submit" className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors">
                  Descartar
                </button>
              </form>
            </div>
          </div>
        ))}

        {resolved.length > 0 && (
          <details className="mt-6">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              Ver resolvidas ({resolved.length})
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {resolved.map((report) => (
                <div key={report.id} className="border rounded p-3 text-sm text-muted-foreground">
                  {report.targetType === "PHOTO" ? "Foto" : "Mensagem"} ·{" "}
                  <span className={report.status === "REMOVED" ? "text-red-600" : "text-green-700"}>
                    {report.status === "REMOVED" ? "Removido" : "Descartado"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}
