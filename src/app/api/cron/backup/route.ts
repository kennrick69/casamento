import { NextRequest, NextResponse } from "next/server";

// TODO[fase-2]: implementar job de backup semanal.
// - Exportar JSON de cada evento publicado + ZIP das fotos.
// - Enviar por email via EmailProvider.
// - Acionar via cron do Railway (railway cron add).
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: implementar backup
  return NextResponse.json({ ok: true, message: "Backup job stub — implement in Fase 2" });
}
