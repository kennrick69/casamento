import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

interface BackupEntry {
  slug: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const volumePath = process.env.RAILWAY_VOLUME_PATH;

  const logs = await prisma.authLog.findMany({
    where: { action: { in: ["BACKUP_CREATED", "BACKUP_FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const fileEntries: BackupEntry[] = [];

  if (volumePath) {
    try {
      const backupsRoot = path.join(volumePath, "backups");
      const slugDirs = await fs.readdir(backupsRoot).catch(() => [] as string[]);
      for (const slug of slugDirs) {
        const dir = path.join(backupsRoot, slug);
        const files = await fs.readdir(dir).catch(() => [] as string[]);
        for (const file of files) {
          if (!file.endsWith(".json")) continue;
          const stat = await fs.stat(path.join(dir, file)).catch(() => null);
          if (!stat) continue;
          fileEntries.push({
            slug,
            filename: file,
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString(),
          });
        }
      }
      fileEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      // volume not mounted
    }
  }

  return NextResponse.json({ logs, files: fileEntries });
}
