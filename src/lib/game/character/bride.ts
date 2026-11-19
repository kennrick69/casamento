import { normalizeName } from "@/lib/game/identity";

// Só a noiva (membro do casal) pode usar o vestido de noiva. Heurística do
// slice: o 1º nome do jogador aparece entre os nomes do casal. Refinar depois
// com papel explícito (EventRole). Server-only por tabela via normalizeName.
export function canWearBride(playerName: string | null, coupleNames: string): boolean {
  if (!playerName) return false;
  const tokens = new Set(normalizeName(coupleNames).split(" "));
  const first = normalizeName(playerName).split(" ")[0];
  return Boolean(first) && tokens.has(first);
}
