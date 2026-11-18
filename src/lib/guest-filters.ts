// Visitantes (Modo Gamificado — Guest.isVisitor=true) NÃO são convidados de
// verdade: entram pelo jogo, têm e-mail sintético e não devem aparecer em
// NENHUMA listagem/contagem do site clássico ou do painel (lista de convidados,
// RSVP, exportações, plano de mesas, check-in, e-mails, notificações).
//
// Spread EXCLUDE_VISITORS em qualquer `where` que liste/conte/exporte convidados
// ou escolha destinatários de e-mail. É greppável de propósito: para achar todos
// os pontos filtrados, procure por `EXCLUDE_VISITORS`.
export const EXCLUDE_VISITORS = { isVisitor: false } as const;

// Domínio sintético dos visitantes (ver src/lib/game/identity.ts).
export const VISITOR_EMAIL_DOMAIN = "visitante.voem.invalid";

// Endereço não-entregável: TLD `.invalid` é reservado (RFC 2606) e nunca existe
// de verdade. Cobre visitantes (@visitante.voem.invalid) E convidados removidos
// por LGPD (@deleted.invalid). A trava de e-mail bloqueia o TLD inteiro, então
// nenhum e-mail real jamais bate aqui.
export function isUndeliverableEmail(to: string): boolean {
  return /\.invalid$/i.test(to.trim());
}
