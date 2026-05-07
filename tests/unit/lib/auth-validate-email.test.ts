import { describe, it, expect } from "vitest";
import { validateEmail } from "@/lib/auth/validate-email";

describe("validateEmail", () => {
  it("aceita email válido", () => {
    expect(validateEmail("usuario@gmail.com")).toEqual({ ok: true });
  });

  it("aceita email com +alias", () => {
    expect(validateEmail("usuario+tag@gmail.com")).toEqual({ ok: true });
  });

  it("aceita email com subdomínio", () => {
    expect(validateEmail("usuario@mail.empresa.com.br")).toEqual({ ok: true });
  });

  it("rejeita formato inválido — sem @", () => {
    const r = validateEmail("semarvoba.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("format");
  });

  it("rejeita formato inválido — sem domínio", () => {
    const r = validateEmail("usuario@");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("format");
  });

  it("rejeita email descartável (mailinator)", () => {
    const r = validateEmail("teste@mailinator.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("disposable");
  });

  it("rejeita email descartável (tempmail)", () => {
    const r = validateEmail("x@temp-mail.org");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("disposable");
  });

  it("rejeita email acima de 254 chars", () => {
    const long = "a".repeat(245) + "@gmail.com"; // 245+10 = 255 > 254
    const r = validateEmail(long);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_long");
  });

  it("aceita email com exatamente 254 chars", () => {
    const local = "a".repeat(244);
    const email = `${local}@g.io`; // 244+1+4 = 249 < 254
    expect(validateEmail(email)).toEqual({ ok: true });
  });
});
