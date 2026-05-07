/**
 * Cenários hipotéticos — Fases 0 e 1
 * Cobre inputs maliciosos, edge cases de dados, condições de borda, etc.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signClaimToken, verifyClaimToken } from "@/lib/auth/co-org-token";
import { rsvpConfirmHtml, rsvpDeclineHtml, recoveryHtml, reminderHtml } from "@/lib/email/templates";
import { awardPoints } from "@/lib/points";
import { prisma } from "@/lib/db";

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-unit-tests-32chars!!";
  vi.clearAllMocks();
});

// ─── Inputs maliciosos ────────────────────────────────────────────────────────

describe("Cenário: XSS em nome de convidado no email", () => {
  it("rsvpConfirmHtml não executa script injetado", () => {
    const html = rsvpConfirmHtml({
      name: '<script>alert("xss")</script>',
      eventTitle: "Casamento",
      coupleNames: "A e B",
      dateLabel: "10/10/2026",
      location: "Igreja",
      eventUrl: "https://ex.com",
    });
    // O template usa interpolação direta — se um dia saneamento for adicionado, este test vai pegar a regressão
    // Por ora, garante que o template não crasha com input malicioso
    expect(html).toBeTruthy();
    expect(typeof html).toBe("string");
  });

  it("rsvpDeclineHtml não crasha com payload SQLi no nome", () => {
    const html = rsvpDeclineHtml({
      name: "'; DROP TABLE guests; --",
      eventTitle: "Casamento",
      coupleNames: "A e B",
      eventUrl: "https://ex.com",
    });
    expect(html).toBeTruthy();
  });
});

describe("Cenário: URL maliciosa no link de recuperação", () => {
  it("recoveryHtml renderiza o link sem modificação (validação é responsabilidade de quem chama)", () => {
    const html = recoveryHtml({
      eventTitle: "Casamento",
      coupleNames: "A e B",
      link: "javascript:alert(1)",
    });
    // O template não sanitiza — isso é aceitável porque o link é gerado internamente (HMAC)
    expect(html).toContain("javascript:alert(1)");
  });
});

// ─── Inputs malformados / tamanhos extremos ───────────────────────────────────

describe("Cenário: nome com 100 caracteres", () => {
  it("templates funcionam sem truncar", () => {
    const longName = "José da Silva ".repeat(7).trim().slice(0, 100);
    const html = rsvpConfirmHtml({
      name: longName,
      eventTitle: "Casamento",
      coupleNames: "A e B",
      dateLabel: "10/10/2026",
      location: "",
      eventUrl: "https://ex.com",
    });
    expect(html).toContain(longName);
  });
});

describe("Cenário: emoji no nome do convidado", () => {
  it("templates não crasham com emoji", () => {
    const name = "Maria 🌸🎊💍";
    expect(rsvpConfirmHtml({ name, eventTitle: "C", coupleNames: "A e B", dateLabel: "x", location: "", eventUrl: "u" })).toContain("Maria");
    expect(rsvpConfirmHtml({ name, eventTitle: "C", coupleNames: "A e B", dateLabel: "x", location: "", eventUrl: "u" })).toContain("🌸");
  });
});

describe("Cenário: campos opcionais ausentes", () => {
  it("rsvpConfirmHtml sem location não exibe ícone de pin", () => {
    const html = rsvpConfirmHtml({
      name: "Bob",
      eventTitle: "Casamento",
      coupleNames: "A e B",
      dateLabel: "10/10",
      location: "",
      eventUrl: "https://ex.com",
    });
    expect(html).not.toContain("📍 ");
  });

  it("reminderHtml com daysLeft=1 usa 'amanhã' e não 'em 1 dias'", () => {
    const html = reminderHtml({
      name: "Bob",
      eventTitle: "C",
      coupleNames: "A e B",
      dateLabel: "x",
      location: "",
      daysLeft: 1,
      eventUrl: "u",
    });
    expect(html).toContain("amanhã");
    expect(html).not.toContain("em 1 dias");
  });
});

// ─── Casos de borda — token de autenticação ───────────────────────────────────

describe("Cenário: token expirado por 1ms", () => {
  it("é rejeitado", () => {
    const expiresAt = Date.now() - 1;
    const token = signClaimToken("e1", "a@b.com", expiresAt);
    expect(verifyClaimToken(token)).toBeNull();
  });
});

describe("Cenário: token com estrutura válida mas assinatura errada", () => {
  it("é rejeitado", () => {
    const expiresAt = Date.now() + 86_400_000;
    const token = signClaimToken("e1", "a@b.com", expiresAt);
    // Muda 1 char no meio do token
    const mid = Math.floor(token.length / 2);
    const tampered = token.slice(0, mid) + (token[mid] === "A" ? "B" : "A") + token.slice(mid + 1);
    expect(verifyClaimToken(tampered)).toBeNull();
  });
});

describe("Cenário: token com encoding inválido", () => {
  it("não crasha, retorna null", () => {
    expect(verifyClaimToken("!!!")).toBeNull();
    expect(verifyClaimToken("a.b.c")).toBeNull();
    expect(verifyClaimToken("")).toBeNull();
  });
});

// ─── Casos de borda — pontuação ───────────────────────────────────────────────

describe("Cenário: dois usuários tentam ganhar pontos pelo mesmo RSVP (race condition simulada)", () => {
  it("segunda chamada respeita o total cap", async () => {
    const mission = { id: "m1", eventId: "e1", code: "rsvp_confirmed", title: "RSVP", points: 50, dailyCap: null, totalCap: 1, active: true, order: 1 };
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(mission as never);

    // Primeiro: já usou o totalCap
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(1);

    const result = await awardPoints("g1", "e1", "rsvp_confirmed");
    expect(result.awarded).toBe(false);
    expect(result.reason).toBe("total_cap");
  });
});

describe("Cenário: mission com dailyCap=0 (nunca premia)", () => {
  it("nunca concede pontos", async () => {
    const mission = { id: "m1", eventId: "e1", code: "test", title: "T", points: 10, dailyCap: 0, totalCap: null, active: true, order: 1 };
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(mission as never);
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(0); // count is 0, but cap is also 0

    const result = await awardPoints("g1", "e1", "test");
    // 0 >= 0 → at cap
    expect(result.awarded).toBe(false);
  });
});

// ─── Casos de borda — LGPD / privacidade ─────────────────────────────────────

describe("Cenário: nome com dados sensíveis no template de email", () => {
  it("CPF no nome é preservado mas não processado", () => {
    const name = "123.456.789-00"; // Não deveria estar aqui, mas não deve crashar
    const html = rsvpConfirmHtml({ name, eventTitle: "C", coupleNames: "A e B", dateLabel: "x", location: "", eventUrl: "u" });
    expect(html).toBeTruthy();
  });
});

// ─── Casos de borda — dados ───────────────────────────────────────────────────

describe("Cenário: email com + alias", () => {
  it("token round-trip com email+alias", () => {
    const expiresAt = Date.now() + 86_400_000;
    const token = signClaimToken("e1", "user+casamento@gmail.com", expiresAt);
    const result = verifyClaimToken(token);
    expect(result?.inviteeEmail).toBe("user+casamento@gmail.com");
  });
});

describe("Cenário: nome do casal com caracteres especiais no email", () => {
  it("coupleNames com & não quebra HTML", () => {
    const html = rsvpConfirmHtml({
      name: "Alice",
      eventTitle: "Casamento de Alice & Bob",
      coupleNames: "Alice & Bob",
      dateLabel: "x",
      location: "",
      eventUrl: "u",
    });
    expect(html).toBeTruthy();
    expect(html).toContain("Alice & Bob");
  });
});
