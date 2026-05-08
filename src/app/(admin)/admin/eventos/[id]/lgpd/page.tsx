import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { EventNav } from "@/components/admin/event-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import Link from "next/link";

interface Props { params: Promise<{ id: string }> }

export default async function LgpdPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  const [totalGuests, deletedGuests] = await Promise.all([
    prisma.guest.count({ where: { eventId } }),
    prisma.guest.count({ where: { eventId, deletedAt: { not: null } } }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="LGPD" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <h1 className="text-2xl font-bold mb-2">LGPD</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Gestão de dados pessoais conforme a Lei Geral de Proteção de Dados.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total de convidados</p>
            <p className="text-2xl font-bold">{totalGuests}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Dados esquecidos</p>
            <p className="text-2xl font-bold">{deletedGuests}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold text-sm mb-1">Exportar dados dos convidados</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Download CSV com todos os dados pessoais (nome, email, telefone, confirmação de presença).
            </p>
            <Link
              href={`/api/admin/eventos/${eventId}/convidados/export`}
              className="text-sm px-4 py-2 rounded border border-border hover:bg-muted transition-colors inline-block"
            >
              Exportar CSV
            </Link>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="font-semibold text-sm mb-1">Solicitações de esquecimento</h2>
            <p className="text-xs text-muted-foreground">
              Convidados podem solicitar esquecimento em <code className="text-xs bg-muted px-1 rounded">/{"{slug}"}/esquecam</code>.
              Os dados são anonimizados imediatamente (soft-delete) e removidos definitivamente após 30 dias.
              Total esquecido: <strong>{deletedGuests}</strong>.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="font-semibold text-sm mb-1">Retenção de dados</h2>
            <p className="text-xs text-muted-foreground">
              Dados de convidados são mantidos enquanto o evento estiver ativo. Ao arquivar o evento,
              os dados permanecem disponíveis para download por 90 dias, após os quais devem ser removidos manualmente.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
