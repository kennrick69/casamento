import { describe, it, expect } from "vitest";
import {
  normalizeName,
  normalizePhone,
  nameMatches,
  phonesMatch,
  firstName,
} from "@/lib/game/identity";

// Opção B: identificação por nome + celular. Testa a normalização e o match.

describe("normalizeName", () => {
  it("remove acento, caixa e espaços extras", () => {
    expect(normalizeName("  José   RICARDO  ")).toBe("jose ricardo");
    expect(normalizeName("Letícia Conceição")).toBe("leticia conceicao");
  });
});

describe("normalizePhone", () => {
  it("mantém só dígitos", () => {
    expect(normalizePhone("(11) 98888-7777")).toBe("11988887777");
  });
  it("remove o código do país 55 de número BR completo", () => {
    expect(normalizePhone("+55 11 98888-7777")).toBe("11988887777");
    expect(normalizePhone("5511988887777")).toBe("11988887777");
  });
  it("não mexe em número curto sem 55", () => {
    expect(normalizePhone("988887777")).toBe("988887777");
  });
});

describe("nameMatches (1º nome exato + sobrenome parcial)", () => {
  const guest = "Marta Silva Souza";
  it("aceita só o primeiro nome", () => {
    expect(nameMatches("Marta", guest)).toBe(true);
    expect(nameMatches("marta", guest)).toBe(true);
  });
  it("aceita primeiro nome + sobrenome parcial", () => {
    expect(nameMatches("Marta Silva", guest)).toBe(true);
    expect(nameMatches("Marta Sil", guest)).toBe(true);
    expect(nameMatches("Marta Silva Souza", guest)).toBe(true);
  });
  it("recusa primeiro nome incompleto", () => {
    expect(nameMatches("Mart", guest)).toBe(false);
  });
  it("recusa sobrenome sem o primeiro nome", () => {
    expect(nameMatches("Silva", guest)).toBe(false);
    expect(nameMatches("Souza", guest)).toBe(false);
  });
  it("recusa sobrenome que não bate", () => {
    expect(nameMatches("Marta Pereira", guest)).toBe(false);
  });
  it("recusa input mais longo que o nome", () => {
    expect(nameMatches("Marta Silva Souza Lima", guest)).toBe(false);
  });
});

describe("phonesMatch (tolera DDD/55 ausentes)", () => {
  it("bate entre formatos do mesmo número", () => {
    expect(phonesMatch("(11) 98888-7777", "5511988887777")).toBe(true);
    expect(phonesMatch("11988887777", "+55 (11) 98888-7777")).toBe(true);
    expect(phonesMatch("988887777", "11 98888-7777")).toBe(true);
  });
  it("não bate números diferentes", () => {
    expect(phonesMatch("11988887777", "11988886666")).toBe(false);
    expect(phonesMatch("11988887777", "21988887777")).toBe(false);
  });
  it("recusa entradas curtas demais", () => {
    expect(phonesMatch("123", "11988887777")).toBe(false);
  });
});

describe("firstName", () => {
  it("pega só o primeiro nome", () => {
    expect(firstName("Marta Silva Souza")).toBe("Marta");
    expect(firstName("  ")).toBe("");
  });
});
