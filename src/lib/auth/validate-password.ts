import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import { adjacencyGraphs, dictionary } from "@zxcvbn-ts/language-common";
import ptBrDictionary from "@zxcvbn-ts/language-pt-br";

zxcvbnOptions.setOptions({
  graphs: adjacencyGraphs,
  dictionary: {
    ...dictionary,
    ...ptBrDictionary.dictionary,
  },
});

const HAS_LETTER = /[a-zA-Z]/;
const HAS_NUMBER = /[0-9]/;
const MIN_LENGTH = 8;
const MIN_ZXCVBN_SCORE = 2;

export type PasswordValidationResult =
  | { ok: true; score: number }
  | { ok: false; reason: "too_short" | "no_letter" | "no_number" | "too_weak"; score: number };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < MIN_LENGTH) return { ok: false, reason: "too_short", score: 0 };
  if (!HAS_LETTER.test(password)) return { ok: false, reason: "no_letter", score: 0 };
  if (!HAS_NUMBER.test(password)) return { ok: false, reason: "no_number", score: 0 };

  const { score } = zxcvbn(password);
  if (score < MIN_ZXCVBN_SCORE) return { ok: false, reason: "too_weak", score };

  return { ok: true, score };
}

export function getPasswordScore(password: string): number {
  if (!password) return 0;
  return zxcvbn(password).score;
}
