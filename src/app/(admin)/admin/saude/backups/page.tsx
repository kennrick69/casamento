import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata: Metadata = { title: "Backups" };

interface BackupFile {
  slug: string;
  filename: string;
  sizeKb: number;
  date: string;
}

async function listBackupFiles(): Promise<BackupFile[]> {
  const volumePath = process.env.RAILWAY_VOLUME_PATH;
  if (!volumePath) return [];
  const files: BackupFile[] = [];
  try {
    const backupsRoot = path.join(volumePath, "backups");
    const slugDirs = await fs.readdir(backupsRoot).catch(() => [] as string[]);
    for (const slug of slugDirs) {
      const dir = path.join(backupsRoot, slug);
      const entries = await fs.readdir(dir).catch(() => [] as string[]);
      for (const entry of entries) {
        if (!entry.endsWith(".json")) continue;
        const stat = await fs.stat(path.join(dir, entry)).catch(() => null);
        files.push({
          slug,
          filename: entry,
          sizeKb: stat ? Math.round(stat.size / 1024) : 0,
          date: stat ? stat.mtime.toISOString() : "",
        });
      }
    }
  } catch {
    // volume not mounted
  }
  return files.sort((a, b) => b.date.localeCompare(a.date));
}

export default async function BackupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [files, logs] = await Promise.all([
    listBackupFiles(),
    prisma.authLog.findMany({
      where: { action: { in: ["BACKUP_CREATED", "BACKUP_FAILED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const volumePresent = !!process.env.RAILWAY_VOLUME_PATH;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4 flex items-center gap-3">
        <Link href="/admin/saude" className="text-sm text-muted-foreground hover:text-foreground">
          ← Saúde
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-semibold">Backups</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!volumePresent && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            ⚠ Variável <code className="font-mono">RAILWAY_VOLUME_PATH</code> não configurada — backups em disco desabilitados.
          </div>
        )}

        {files.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Arquivos ({files.length})
            </h2>
            <div className="flex flex-col gap-2">
              {files.map((f) => (
                <div
                  key={`${f.slug}/${f.filename}`}
                  className="bg-background rounded-lg border border-border px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium font-mono">{f.slug} / {f.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.date
                        ? format(new Date(f.date), "d MMM yyyy HH:mm", { locale: ptBR })
                        : "—"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{f.sizeKb} KB</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Log de execuções ({logs.length})
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log) => {
                const meta = log.metadata as Record<string, unknown> | null;
                const isError = log.action === "BACKUP_FAILED";
                return (
                  <div
                    key={log.id}
                    className={`rounded-lg border px-4 py-3 text-sm ${isError ? "border-red-200 bg-red-50" : "border-border bg-background"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isError ? "text-red-800" : "text-green-800"}`}>
                        {isError ? "✗ Falhou" : "✓ Criado"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(log.createdAt, "d MMM yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {meta && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {meta.slug as string}{meta.guestCount !== undefined ? ` · ${meta.guestCount} convidados` : ""}
                        {meta.error ? ` · ${meta.error}` : ""}
                        {meta.pruned ? ` · ${meta.pruned} antigos removidos` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
