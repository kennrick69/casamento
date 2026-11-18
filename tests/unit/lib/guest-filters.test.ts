import { describe, it, expect, vi } from "vitest";
import {
  EXCLUDE_VISITORS,
  VISITOR_EMAIL_DOMAIN,
  isUndeliverableEmail,
} from "@/lib/guest-filters";
import { withUndeliverableGuard } from "@/lib/email/guard";
import type { EmailProvider } from "@/lib/email/types";

// Garante que visitantes do Modo Gamificado (Guest.isVisitor=true, e-mail
// sintético @visitante.voem.invalid) nunca recebem e-mail e são filtráveis
// das listagens/contagens do clássico.

describe("EXCLUDE_VISITORS (filtro de listagem)", () => {
  it("é um where que exige isVisitor=false", () => {
    expect(EXCLUDE_VISITORS).toEqual({ isVisitor: false });
  });
});

describe("isUndeliverableEmail", () => {
  it("reconhece o domínio sintético de visitante", () => {
    expect(VISITOR_EMAIL_DOMAIN.endsWith(".invalid")).toBe(true);
    expect(isUndeliverableEmail(`visitante_abc123@${VISITOR_EMAIL_DOMAIN}`)).toBe(true);
  });

  it("reconhece o domínio de removidos por LGPD (.invalid)", () => {
    expect(isUndeliverableEmail("removed_xyz@deleted.invalid")).toBe(true);
  });

  it("aceita e-mails reais (não bloqueia)", () => {
    expect(isUndeliverableEmail("marta@gmail.com")).toBe(false);
    expect(isUndeliverableEmail("jose.ricardo@example.com.br")).toBe(false);
    // .invalid só no fim conta; não casa no meio do local-part
    expect(isUndeliverableEmail("a.invalid.person@gmail.com")).toBe(false);
  });

  it("ignora espaços nas bordas", () => {
    expect(isUndeliverableEmail("  x@visitante.voem.invalid  ")).toBe(true);
  });
});

describe("withUndeliverableGuard (trava de envio — defesa em profundidade)", () => {
  function fakeProvider() {
    const send = vi.fn(async () => ({ id: "real-id" }));
    return { provider: { send } as EmailProvider, send };
  }

  it("NÃO entrega e-mail a endereço .invalid e não chama o provider", async () => {
    const { provider, send } = fakeProvider();
    const guarded = withUndeliverableGuard(provider);

    for (const to of [
      "visitante_a@visitante.voem.invalid",
      "removed_b@deleted.invalid",
    ]) {
      const res = await guarded.send({ to, subject: "oi", html: "<p>oi</p>" });
      expect(res.id).toBe("skipped-undeliverable");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("entrega e-mails reais normalmente", async () => {
    const { provider, send } = fakeProvider();
    const guarded = withUndeliverableGuard(provider);

    const res = await guarded.send({ to: "marta@gmail.com", subject: "oi", html: "<p>oi</p>" });
    expect(send).toHaveBeenCalledOnce();
    expect(res.id).toBe("real-id");
  });
});
