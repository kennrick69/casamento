import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { email } from "@/lib/email";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED", archivedAt: null },
    include: {
      guests: { where: { deletedAt: null } },
      journeyItems: true,
      gifts: true,
      organizers: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  const results: { eventId: string; slug: string; guestCount: number }[] = [];

  for (const event of events) {
    const backup = {
      exportedAt: new Date().toISOString(),
      event: {
        id: event.id,
        slug: event.slug,
        coupleNames: event.coupleNames,
        ceremonyDate: event.ceremonyDate,
        status: event.status,
      },
      guests: event.guests.map((g) => ({
        name: g.name,
        email: g.email,
        phone: g.phone,
        rsvpStatus: g.rsvpStatus,
        plusOnes: g.plusOnes,
        dietaryRestrictions: g.dietaryRestrictions,
        createdAt: g.createdAt,
      })),
      journeyItems: event.journeyItems,
      gifts: event.gifts,
    };

    const json = JSON.stringify(backup, null, 2);

    // Salva no volume persistente (se disponível)
    const volumePath = process.env.RAILWAY_VOLUME_PATH;
    if (volumePath) {
      const backupDir = path.join(volumePath, "backups", event.slug);
      await fs.mkdir(backupDir, { recursive: true });
      const filename = `backup-${new Date().toISOString().split("T")[0]}.json`;
      await fs.writeFile(path.join(backupDir, filename), json);
    }

    // Notifica owners por email
    const owners = event.organizers
      .filter((o) => o.role === "OWNER")
      .map((o) => o.user.email);

    for (const ownerEmail of owners) {
      await email.send({
        to: ownerEmail,
        subject: `Backup semanal — ${event.coupleNames}`,
        html: `<p>Backup semanal de <strong>${event.coupleNames}</strong> concluído.</p><p>${event.guests.length} convidados exportados.</p>`,
        text: `Backup de ${event.coupleNames}: ${event.guests.length} convidados.`,
      });
    }

    results.push({ eventId: event.id, slug: event.slug, guestCount: event.guests.length });
  }

  return NextResponse.json({ ok: true, backedUp: results });
}
