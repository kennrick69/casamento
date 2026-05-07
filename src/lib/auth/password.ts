import { hash, verify } from "@node-rs/argon2";

// argon2id — parâmetros alinhados com BLOCO_A spec
const ARGON2_OPTIONS = {
  timeCost: 3,
  memoryCost: 65536, // 64 MB em KiB
  parallelism: 4,
  algorithm: 2, // Argon2id
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  try {
    return await verify(hashed, plain, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}
