import type { EmailProvider, SendEmailOpts } from "./types";
import { isUndeliverableEmail } from "@/lib/guest-filters";

// Defesa em profundidade: envolve qualquer EmailProvider e NUNCA entrega e-mail
// a endereços não-entregáveis (.invalid) — visitantes do modo jogo e convidados
// removidos por LGPD. Mesmo que algum query esqueça de filtrar isVisitor, o
// e-mail para aqui. Retorna um id sentinela para não quebrar loops de envio em
// massa (o chamador trata como "enviado").
export function withUndeliverableGuard(provider: EmailProvider): EmailProvider {
  return {
    async send(opts: SendEmailOpts) {
      if (isUndeliverableEmail(opts.to)) {
        // Não loga o endereço inteiro (pode conter dado sintético/pessoal).
        const masked = opts.to.replace(/^[^@]+/, "***");
        console.warn(`[email] bloqueado: destinatário não-entregável (${masked}).`);
        return { id: "skipped-undeliverable" };
      }
      return provider.send(opts);
    },
  };
}
