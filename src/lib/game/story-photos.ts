// Fotos de uma memória do Bosque (CoupleStoryItem). O conteúdo novo mora em
// `photos` (array de { key, caption }); `photoKey` é o legado de 1 foto só.

export interface StoryPhoto {
  key: string;
  caption: string | null;
}

/** Normaliza o JSON `photos` para StoryPhoto[], caindo no `photoKey` legado. */
export function parseStoryPhotos(photos: unknown, legacyKey?: string | null): StoryPhoto[] {
  const out: StoryPhoto[] = [];
  if (Array.isArray(photos)) {
    for (const p of photos) {
      if (p && typeof p === "object" && typeof (p as { key?: unknown }).key === "string") {
        const key = (p as { key: string }).key.trim();
        if (!key) continue;
        const rawCap = (p as { caption?: unknown }).caption;
        const caption = typeof rawCap === "string" && rawCap.trim() ? rawCap.trim() : null;
        out.push({ key, caption });
      }
    }
  }
  if (out.length === 0 && legacyKey) out.push({ key: legacyKey, caption: null });
  return out.slice(0, 10); // teto por memória (performance no celular)
}

/** Só as keys (para apagar arquivos do volume ao remover a memória). */
export function storyPhotoKeys(photos: unknown, legacyKey?: string | null): string[] {
  return parseStoryPhotos(photos, legacyKey).map((p) => p.key);
}
