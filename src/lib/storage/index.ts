import type { StorageProvider } from "./types";
import { RailwayVolumeStorage } from "./railway-volume";

// Trocar STORAGE_PROVIDER=r2 e adicionar CloudflareR2Storage quando migrar.
// Nunca use o provider diretamente fora deste módulo.
// TODO[tech-debt]: instanciar CloudflareR2Storage quando STORAGE_PROVIDER=r2
export const storage: StorageProvider = new RailwayVolumeStorage();

export type { StorageProvider };
