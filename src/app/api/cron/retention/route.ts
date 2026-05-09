import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { email } from "@/lib/email";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Events with ceremony date older than this threshold get a 30-day archival warning
const WARNING_THRESHOLD_DAYS = 365;
// Events warned more than this many days ago get archived
const ARCHIVE_AFTER_WARNING_DAYS = 30;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const warningCutoff = new Date(now.getTime() - WARNING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const archiveCutoff = new Date(now.getTime() - ARCHIVE_AFTER_WARNING_DAYS * 24 * 60 * 60 * 1000);

  // Step 1: Archive events that were warned >30 days ago
  const toArchive = await prisma.event.findMany({
    where: {
      archivedAt: null,
      archivalWarningAt: { lt: archiveCutoff },
    },
    select: { id: true, slug: true },
  });

  let archived = 0;
  for (const event of toArchive) {
    await prisma.event.update({
      where: { id: event.id },
      data: { archivedAt: now, status: "ARCHIVED" },
    });
    archived++;
  }

  // Step 2: Warn events whose ceremony was >1 year ago and haven't been warned yet
  const toWarn = await prisma.event.findMany({
    where: {
      archivedAt: null,
      archivalWarningAt: null,
      status: { not: "DRAFT" },
      ceremonyDate: { lt: warningCutoff },
    },
    include: {
      organizers: {
        where: { role: "OWNER" },
        include: { user: { select: { email: true, firstName: true } } },
      },
    },
  });

  let warned = 0;
  for (const event of toWarn) {
    const dateStr = event.ceremonyDate
      ? format(event.ceremonyDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      : "data desconhecida";

    for (const org of event.organizers) {
      await email.send({
        to: org.user.email,
        subject: `Seus dados de ${event.coupleNames} serão arquivados em 30 dias`,
        html: `
          <p>Olá, ${org.user.firstName || ""}!</p>
          <p>O evento <strong>${event.coupleNames}</strong> (${dateStr}) completou 1 ano.</p>
          <p>De acordo com nossa política de retenção, os dados deste evento serão arquivados em <strong>30 dias</strong>.</p>
          <p>Se quiser conservar seus dados, faça o download em: <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/saude/backups">Download dos dados</a></p>
          <p>Se não fizer nada, os dados serão arquivados automaticamente.</p>
        `.trim(),
        text: `Seus dados de ${event.coupleNames} (${dateStr}) serão arquivados em 30 dias. Baixe em ${process.env.NEXT_PUBLIC_APP_URL}/admin/saude/backups`,
      });
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { archivalWarningAt: now },
    });

    warned++;
  }

  return NextResponse.json({ ok: true, warned, archived });
}
