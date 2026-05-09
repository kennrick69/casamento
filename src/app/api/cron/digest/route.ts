import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { email } from "@/lib/email";
import { format, subDays, subWeeks, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const today = new Date();
  const isMonday = today.getDay() === 1;

  const organizers = await prisma.eventOrganizer.findMany({
    where: {
      digestFrequency: isMonday ? { in: ["DAILY", "WEEKLY"] } : "DAILY",
      event: { status: "PUBLISHED", archivedAt: null },
    },
    include: {
      user: { select: { email: true, firstName: true } },
      event: {
        select: { id: true, coupleNames: true, ceremonyDate: true, slug: true },
      },
    },
  });

  let sent = 0;

  for (const org of organizers) {
    const ev = org.event;
    if (!ev || !org.user?.email) continue;

    const since = isMonday && org.digestFrequency === "WEEKLY"
      ? startOfDay(subWeeks(today, 1))
      : startOfDay(subDays(today, 1));

    const [newRsvps, pendingPhotos, pendingChat] = await Promise.all([
      prisma.guest.count({
        where: { eventId: ev.id, rsvpStatus: "CONFIRMED", createdAt: { gte: since }, deletedAt: null },
      }),
      prisma.photo.count({ where: { eventId: ev.id, approvedByCouple: false, removedAt: null } }),
      prisma.chatMessage.count({ where: { eventId: ev.id, removedAt: null, reports: { some: {} } } }),
    ]);

    const daysUntil = Math.ceil(
      (new Date(ev.ceremonyDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const lines: string[] = [];
    if (newRsvps > 0) lines.push(`• ${newRsvps} novo${newRsvps > 1 ? "s" : ""} convidado${newRsvps > 1 ? "s" : ""} confirmado${newRsvps > 1 ? "s" : ""}`);
    if (pendingPhotos > 0) lines.push(`• ${pendingPhotos} foto${pendingPhotos > 1 ? "s" : ""} aguardando aprovação no mural`);
    if (pendingChat > 0) lines.push(`• ${pendingChat} mensagem${pendingChat > 1 ? "s" : ""} sinalizada${pendingChat > 1 ? "s" : ""} no chat`);
    if (daysUntil > 0) lines.push(`• Faltam ${daysUntil} dia${daysUntil !== 1 ? "s" : ""} para o evento`);

    if (lines.length === 0) continue;

    const period = org.digestFrequency === "WEEKLY" ? "semanal" : "diário";
    const dateLabel = format(today, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

    await email.send({
      to: org.user.email,
      subject: `Resumo ${period} — ${ev.coupleNames} (${dateLabel})`,
      html: `
        <p>Olá, ${org.user.firstName || ""}!</p>
        <p>Resumo ${period} de <strong>${ev.coupleNames}</strong>:</p>
        <ul style="margin: 16px 0; padding-left: 20px; line-height: 1.8">
          ${lines.map((l) => `<li>${l.replace("• ", "")}</li>`).join("")}
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/eventos/${ev.id}">Abrir painel →</a></p>
      `.trim(),
      text: `Resumo ${period} de ${ev.coupleNames}:\n${lines.join("\n")}`,
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
