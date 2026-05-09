import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { email } from "@/lib/email";
import { uploadBackupToB2, pruneOldB2Backups, isB2Configured } from "@/lib/backup/b2";
import fs from "fs/promises";
import path from "path";

const RETENTION_DAYS = 60;

async function pruneOldBackups(backupDir: string): Promise<number> {
  let pruned = 0;
  try {
    const entries = await fs.readdir(backupDir);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = path.join(backupDir, entry);
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(filePath);
        pruned++;
      }
    }
  } catch {
    // dir may not exist yet — ignore
  }
  return pruned;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "cron";

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

  const results: { eventId: string; slug: string; guestCount: number; pruned: number }[] = [];
  let failedCount = 0;

  for (const event of events) {
    try {
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
      const dateStr = new Date().toISOString().split("T")[0];
      let pruned = 0;

      // Local Railway volume backup
      const volumePath = process.env.RAILWAY_VOLUME_PATH;
      if (volumePath) {
        const backupDir = path.join(volumePath, "backups", event.slug);
        await fs.mkdir(backupDir, { recursive: true });
        const filename = `backup-${dateStr}.json`;
        await fs.writeFile(path.join(backupDir, filename), json);
        pruned = await pruneOldBackups(backupDir);
      }

      // Off-site B2 backup
      const b2Result = await uploadBackupToB2(event.slug, dateStr, json);
      const b2Ok = b2Result.ok;
      const b2Reason = b2Result.reason;
      if (b2Ok) await pruneOldB2Backups(event.slug);

      // Notifica owners por email
      const owners = event.organizers
        .filter((o) => o.role === "OWNER")
        .map((o) => o.user.email);

      for (const ownerEmail of owners) {
        await email.send({
          to: ownerEmail,
          subject: `Backup diário — ${event.coupleNames}`,
          html: `<p>Backup diário de <strong>${event.coupleNames}</strong> concluído.</p><p>${event.guests.length} convidados exportados.</p>`,
          text: `Backup de ${event.coupleNames}: ${event.guests.length} convidados.`,
        });
      }

      await prisma.authLog.create({
        data: {
          action: "BACKUP_CREATED",
          ip,
          metadata: {
            eventId: event.id,
            slug: event.slug,
            guestCount: event.guests.length,
            pruned,
            b2: isB2Configured() ? (b2Ok ? "ok" : b2Reason) : "not-configured",
          },
        },
      });

      results.push({ eventId: event.id, slug: event.slug, guestCount: event.guests.length, pruned });
    } catch (err) {
      failedCount++;
      await prisma.authLog.create({
        data: {
          action: "BACKUP_FAILED",
          ip,
          metadata: { eventId: event.id, slug: event.slug, error: String(err) },
        },
      });
    }
  }

  return NextResponse.json({ ok: failedCount === 0, backedUp: results, failed: failedCount });
}
