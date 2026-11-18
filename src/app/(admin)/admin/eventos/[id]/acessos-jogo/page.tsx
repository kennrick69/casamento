import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Acessos ao jogo" };

const METHOD_LABEL: Record<string, string> = {
  name_phone: "Nome + celular",
  passkey: "Passkey",
  visitor: "Visitante",
};

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

interface Props {
  params: Promise<{ id: string }>;
}

// Auditoria das identificações no Modo Gamificado. Como a entrada por
// nome+celular não verifica posse do número, os noivos conseguem ver aqui
// quem entrou, quando, como e de qual aparelho/IP.
export default async function AcessosJogoPage({ params }: Props) {
  const { id: eventId } = await params;
  try {
    await requireOrganizer(eventId);
  } catch {
    notFound();
  }

  const logs = await prisma.guestIdentificationLog.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      guest: { select: { name: true, playerName: true, isVisitor: true } },
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Acessos ao jogo" eventId={eventId} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />

        <h1 className="text-2xl font-bold mb-2">Acessos ao jogo</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Cada identificação no modo jogo (últimas 200). A entrada por
          nome+celular não confirma o número, então use isto para auditar quem
          entrou. Cancelamentos e mudanças de acompanhantes também avisam o
          convidado por e-mail.
        </p>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum acesso registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Quando</th>
                  <th className="px-3 py-2 font-medium">Convidado</th>
                  <th className="px-3 py-2 font-medium">Como</th>
                  <th className="px-3 py-2 font-medium">Aparelho / IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{fmt.format(log.createdAt)}</td>
                    <td className="px-3 py-2">
                      {log.guest.playerName || log.guest.name}
                      {log.guest.isVisitor && (
                        <span className="ml-1 text-xs text-muted-foreground">(visitante)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {METHOD_LABEL[log.method] ?? log.method}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground break-all">
                      {log.ip ?? "—"}
                      {log.deviceId ? ` · dev:${log.deviceId.slice(0, 8)}` : ""}
                      {log.userAgent ? ` · ${log.userAgent.slice(0, 60)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
