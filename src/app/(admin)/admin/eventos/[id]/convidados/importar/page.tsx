import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/authorization";
import { AdminHeader } from "@/components/admin/admin-header";
import { EventNav } from "@/components/admin/event-nav";
import { ImportClient } from "./import-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Importar convidados" };

interface Props { params: Promise<{ id: string }> }

export default async function ImportarPage({ params }: Props) {
  const { id: eventId } = await params;
  try { await requireOrganizer(eventId); } catch { notFound(); }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Importar convidados" eventId={eventId} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <EventNav eventId={eventId} />
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Importar convidados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importe uma planilha CSV ou Excel. Baixe o modelo abaixo para ver o formato esperado.
          </p>
        </div>
        <ImportClient eventId={eventId} />
      </main>
    </div>
  );
}
