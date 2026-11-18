import { describe, it, expect, vi, beforeEach } from "vitest";

// Testa o fluxo RSVP clássico real (submitRsvp) após a mudança da Opção B:
// 1) 1ª confirmação, 2) dono edita acompanhantes, 3) dono cancela,
// 4) não-dono com e-mail existente → magic link. E pontos só na 1ª confirmação.
//
// prisma e @/lib/email já são mockados globalmente (tests/unit/setup.ts); aqui
// aumentamos o mock (guest.findFirst, guestCompanion, $transaction callback) e
// mockamos next/headers + helpers de request.

const h = vi.hoisted(() => ({ jar: new Map<string, string>(), ip: "1.2.3.4" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (h.jar.has(k) ? { value: h.jar.get(k)! } : undefined),
    set: (k: string, v: string) => void h.jar.set(k, v),
    delete: (k: string) => void h.jar.delete(k),
  }),
  headers: async () => ({ get: (k: string) => (k === "x-forwarded-for" ? h.ip : null) }),
}));
vi.mock("@/lib/points", () => ({ awardPoints: vi.fn().mockResolvedValue({ awarded: true, points: 50 }) }));
vi.mock("@/lib/locations", () => ({ getMainLocation: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

import { submitRsvp } from "@/app/(public)/[slug]/rsvp/actions";
import { prisma } from "@/lib/db";
import { email } from "@/lib/email";
import { awardPoints } from "@/lib/points";

const EVENT = {
  id: "ev1",
  title: "Casamento",
  coupleNames: "José & Letícia",
  ceremonyDate: new Date("2027-05-29T21:00:00Z"),
  ceremonyLocation: null,
  timezone: "America/Sao_Paulo",
  rsvpEarlyDeadline: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prisma as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sentEmails = () => (email.send as any).mock.calls.map((c: any[]) => c[0]);

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const baseForm = {
  slug: "demo",
  name: "Marta Silva",
  emailAddr: "marta@example.com",
  rsvpStatus: "CONFIRMED",
  consentTerms: "on",
};

beforeEach(() => {
  h.jar = new Map();
  vi.clearAllMocks();
  p.event.findUnique.mockResolvedValue(EVENT);
  p.guest.findUnique.mockResolvedValue(null); // sem convidado existente por padrão
  p.guest.findFirst = vi.fn().mockResolvedValue(null); // getCurrentGuest: sem sessão
  p.guest.create = vi.fn().mockImplementation(({ data }: { data: object }) => ({ id: "g-new", ...data }));
  p.guest.update = vi.fn().mockImplementation(({ data }: { data: object }) => ({ id: "g1", ...data }));
  p.guestCompanion = {
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  // $transaction no formato callback (submitRsvp usa (tx) => ...).
  p.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(p));
});

const ACTIVE_OWNER = {
  id: "g1",
  email: "marta@example.com",
  sessionToken: "tok1",
  deletedAt: null,
  banned: false,
  rsvpStatus: "CONFIRMED" as const,
};

describe("RSVP clássico — fluxo completo (Opção B)", () => {
  it("1) 1ª confirmação: cria convidado, pontua, envia confirmação", async () => {
    const res = await submitRsvp(fd({ ...baseForm, companionsJson: "[]" }));

    expect(res).toMatchObject({ ok: true, status: "CONFIRMED" });
    expect(p.guest.create).toHaveBeenCalledTimes(1);
    expect(awardPoints).toHaveBeenCalledWith(expect.anything(), "ev1", "rsvp_confirmed");
    const subjects = sentEmails().map((e: { subject: string }) => e.subject);
    expect(subjects.some((s: string) => s.includes("confirmada"))).toBe(true);
  });

  it("2) dono edita acompanhantes: atualiza, avisa por e-mail, NÃO pontua de novo", async () => {
    p.guest.findUnique.mockResolvedValue(ACTIVE_OWNER); // e-mail já existe (ativo)
    p.guest.findFirst.mockResolvedValue({ id: "g1" }); // sessão = dono
    h.jar.set("guest_token", "tok1");
    p.guestCompanion.findMany.mockResolvedValue([{ name: "Ana", type: "ADULT" }]); // antes

    const companionsJson = JSON.stringify([
      { name: "Ana", type: "ADULT" },
      { name: "Beto", type: "CHILD" }, // mudou
    ]);
    const res = await submitRsvp(fd({ ...baseForm, companionsJson }));

    expect(res).toMatchObject({ ok: true });
    expect(p.guest.update).toHaveBeenCalledTimes(1);
    expect(p.guest.create).not.toHaveBeenCalled();
    expect(awardPoints).not.toHaveBeenCalled(); // já estava CONFIRMED
    const subjects = sentEmails().map((e: { subject: string }) => e.subject);
    expect(subjects.some((s: string) => s.includes("Alteração"))).toBe(true);
    expect(subjects.some((s: string) => s.includes("confirmada"))).toBe(false);
  });

  it("3) dono cancela presença: status DECLINED, aviso de alteração, sem pontos", async () => {
    p.guest.findUnique.mockResolvedValue(ACTIVE_OWNER);
    p.guest.findFirst.mockResolvedValue({ id: "g1" });
    h.jar.set("guest_token", "tok1");

    const res = await submitRsvp(fd({ ...baseForm, rsvpStatus: "DECLINED", companionsJson: "[]" }));

    expect(res).toMatchObject({ ok: true, status: "DECLINED" });
    expect(p.guest.update).toHaveBeenCalledTimes(1);
    expect(awardPoints).not.toHaveBeenCalled();
    const subjects = sentEmails().map((e: { subject: string }) => e.subject);
    expect(subjects.some((s: string) => s.includes("Alteração"))).toBe(true);
  });

  it("4) não-dono com e-mail existente (sem sessão): cai no magic link, não sobrescreve", async () => {
    p.guest.findUnique.mockResolvedValue(ACTIVE_OWNER); // e-mail existe e está ativo
    p.guest.findFirst.mockResolvedValue(null); // SEM sessão (não é o dono)

    const res = await submitRsvp(fd({ ...baseForm, companionsJson: "[]" }));

    expect(res).toMatchObject({ ok: false, type: "RECOVERY_SENT" });
    expect(p.guest.create).not.toHaveBeenCalled();
    expect(p.guest.update).not.toHaveBeenCalled();
    expect(awardPoints).not.toHaveBeenCalled();
    const subjects = sentEmails().map((e: { subject: string }) => e.subject);
    expect(subjects.some((s: string) => s.includes("Seu acesso"))).toBe(true);
  });

  it("pontua quando o dono sai de PENDING para CONFIRMED (1ª confirmação real)", async () => {
    p.guest.findUnique.mockResolvedValue({ ...ACTIVE_OWNER, rsvpStatus: "PENDING" });
    p.guest.findFirst.mockResolvedValue({ id: "g1" });
    h.jar.set("guest_token", "tok1");

    await submitRsvp(fd({ ...baseForm, companionsJson: "[]" }));
    expect(awardPoints).toHaveBeenCalledWith(expect.anything(), "ev1", "rsvp_confirmed");
  });
});
