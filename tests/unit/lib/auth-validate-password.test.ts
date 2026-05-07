import { describe, it, expect } from "vitest";
import { validatePassword, getPasswordScore } from "@/lib/auth/validate-password";

describe("validatePassword", () => {
  it("aceita senha forte", () => {
    const r = validatePassword("Casamento2026@noivos");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.score).toBeGreaterThanOrEqual(2);
  });

  it("rejeita senha curta (< 8 chars)", () => {
    const r = validatePassword("Ab1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_short");
  });

  it("rejeita senha sem letra", () => {
    const r = validatePassword("12345678");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_letter");
  });

  it("rejeita senha sem número", () => {
    const r = validatePassword("abcdefgh");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_number");
  });

  it("rejeita senha fraca (score < 2 no zxcvbn)", () => {
    // '11111111' tem letra e número... na verdade não tem letra. Usar 'aaa11111'
    // que provavelmente tem score 0-1
    const r = validatePassword("aaa11111");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_weak");
  });

  it("retorna score correto para senha forte", () => {
    const r = validatePassword("Casamento2026@noivos");
    if (r.ok) expect(r.score).toBeGreaterThanOrEqual(3);
  });
});

describe("getPasswordScore", () => {
  it("retorna 0 para string vazia", () => {
    expect(getPasswordScore("")).toBe(0);
  });

  it("retorna score entre 0 e 4", () => {
    const score = getPasswordScore("TesteRandom123!");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(4);
  });
});
