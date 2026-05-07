import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("gera hash diferente do texto plano", async () => {
    const hash = await hashPassword("Senha123!");
    expect(hash).not.toBe("Senha123!");
    expect(hash).toMatch(/^\$argon2/);
  });

  it("verifica senha correta", async () => {
    const hash = await hashPassword("Senha123!");
    expect(await verifyPassword("Senha123!", hash)).toBe(true);
  });

  it("rejeita senha errada", async () => {
    const hash = await hashPassword("Senha123!");
    expect(await verifyPassword("SenhaErrada", hash)).toBe(false);
  });

  it("hashes do mesmo texto são diferentes (salt único)", async () => {
    const h1 = await hashPassword("Senha123!");
    const h2 = await hashPassword("Senha123!");
    expect(h1).not.toBe(h2);
  });

  it("retorna false para hash malformado", async () => {
    expect(await verifyPassword("qualquer", "hash-invalido")).toBe(false);
  });
});
