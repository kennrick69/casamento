import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./types";

// TODO[tech-debt]: migrar para CloudflareR2Storage antes de 100 fotos ou 30 dias antes do evento.
// Ver docs/tech-debt.md para detalhes e checklist de migração.
export class RailwayVolumeStorage implements StorageProvider {
  private readonly base: string;

  constructor(base = process.env.STORAGE_PATH ?? "/data/uploads") {
    this.base = base;
  }

  private resolve(key: string) {
    return path.join(this.base, key);
  }

  async upload(key: string, file: Buffer, _contentType: string) {
    const dest = this.resolve(key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file);
    return { key };
  }

  async delete(key: string) {
    try {
      await fs.unlink(this.resolve(key));
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  getUrl(key: string) {
    return `/api/photos/${encodeURIComponent(key)}`;
  }

  async list(prefix: string) {
    const dir = this.resolve(prefix);
    try {
      const entries = await fs.readdir(dir, { recursive: true });
      return (entries as string[]).map((e) => path.join(prefix, e));
    } catch {
      return [];
    }
  }

  async exists(key: string) {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}
