import { storage } from "./index";

/**
 * Apaga o arquivo (byte no volume) correspondente a um storageKey do mural.
 *
 * Nunca lança: `storage.delete` já engole ENOENT (arquivo já sumiu); aqui
 * capturamos qualquer outra falha e apenas logamos, para que a remoção no
 * banco (soft-delete) nunca seja bloqueada por um problema de I/O no volume.
 *
 * Mesmo idiom já usado em galeria e história (`storage.delete(key).catch(...)`).
 */
export async function deletePhotoFile(
  storageKey: string | null | undefined,
): Promise<void> {
  if (!storageKey) return;
  await storage.delete(storageKey).catch((err) => {
    console.error(`[storage] falha ao apagar arquivo do mural "${storageKey}":`, err);
  });
}
