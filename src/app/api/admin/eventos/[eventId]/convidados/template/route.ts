import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/authorization";

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try { await requireOrganizer(eventId); } catch { return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); }

  const headers = ["nome", "email", "telefone", "grupo", "acompanhantes", "restricao_alimentar"];
  const example = ["Maria Silva", "maria@exemplo.com", "11999990000", "família", "1", "vegetariana"];
  const csv = [headers.join(","), example.join(",")].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-convidados.csv"',
    },
  });
}
