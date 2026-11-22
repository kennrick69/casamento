// Normalização do código de convite (S4a) — PURO, sem DB e sem "server-only",
// para ser usado tanto no servidor (codes.ts, lookupCode) quanto no cliente
// (abertura: "Tenho um código"). Mesma regra nos dois lados → o convidado pode
// digitar com ou sem hífen, com espaços e em minúsculas que dá no mesmo código:
//   "44hu-v9nt"  "44HU V9NT"  "44HUV9NT"  → "44HUV9NT"

// Alfabeto base32 SEM 0/O/1/I (evita confusão na leitura/digitação do impresso).
export const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const INVITE_CODE_LENGTH = 8;

// Maiúsculas, sem espaços/hífens/pontuação, só os símbolos válidos do alfabeto.
export function normalizeCode(raw: string): string {
  return (raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .filter((ch) => ALPHABET.includes(ch))
    .join("");
}

// Formata para exibição/impressão: dois blocos de 4 (ABCD-2345).
export function formatCode(code: string): string {
  const c = normalizeCode(code);
  return c.length === INVITE_CODE_LENGTH ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
