// Templates de email — todos usam o layout base de _layout.ts.
// Exporta os mesmos símbolos que o antigo templates.ts para manter compatibilidade.

import { wrap, h1, eyebrow, p, smallNote, btn, btnLink, detail, infoBox, divider, spacer, c, sans, serif } from "./_layout";

// ── Verificação de email (boas-vindas) ─────────────────────────────────────────

export interface WelcomeVerifyOpts {
  name: string;
  verifyUrl: string;
}

export function welcomeVerifyHtml(o: WelcomeVerifyOpts): string {
  return wrap(`
    ${h1(`Olá, ${o.name}!`)}
    ${eyebrow("Voem. · Confirmação de cadastro")}

    ${p("Sua conta foi criada com sucesso. Confirme seu e-mail para ativar todas as funcionalidades:")}

    <div style="text-align:center;margin:32px 0">
      ${btn(o.verifyUrl, "Confirmar meu e-mail")}
    </div>

    ${smallNote("Este link expira em 24 horas e é de uso único. Se você não criou uma conta no Voem., pode ignorar este e-mail com segurança.")}
  `);
}

export function welcomeVerifyText(o: WelcomeVerifyOpts): string {
  return [
    "Voem. — Confirmação de cadastro",
    "",
    `Olá, ${o.name}!`,
    "",
    "Sua conta foi criada com sucesso. Confirme seu e-mail pelo link abaixo:",
    "",
    o.verifyUrl,
    "",
    "Este link expira em 24 horas.",
    "",
    "Se não criou uma conta, ignore este e-mail.",
  ].join("\n");
}

// ── Reset de senha ─────────────────────────────────────────────────────────────

export interface PasswordResetOpts {
  name: string;
  resetUrl: string;
}

export function passwordResetHtml(o: PasswordResetOpts): string {
  return wrap(`
    ${h1("Redefinir senha")}
    ${spacer(4)}

    ${p(`Olá, <strong style="color:${c.heading}">${o.name}</strong>!`)}
    ${p("Recebemos uma solicitação para redefinir a senha da sua conta no Voem. Clique no botão abaixo para criar uma nova senha:")}

    <div style="text-align:center;margin:32px 0">
      ${btn(o.resetUrl, "Redefinir minha senha")}
    </div>

    ${infoBox(`
      ${smallNote("<strong>Este link expira em 30 minutos</strong> e só pode ser usado uma vez.")}
      ${spacer(8)}
      ${smallNote("Não solicitou a redefinição? Sua senha permanece a mesma — você pode ignorar este e-mail com segurança.")}
    `, "warning")}
  `);
}

export function passwordResetText(o: PasswordResetOpts): string {
  return [
    "Voem. — Redefinição de senha",
    "",
    `Olá, ${o.name}!`,
    "",
    "Acesse o link abaixo para criar uma nova senha (expira em 30 minutos):",
    "",
    o.resetUrl,
    "",
    "Se não solicitou, ignore este e-mail — sua senha permanece a mesma.",
  ].join("\n");
}

// ── Notificação de senha alterada ──────────────────────────────────────────────

export interface PasswordChangedOpts {
  name: string;
}

export function passwordChangedHtml(o: PasswordChangedOpts): string {
  return wrap(`
    ${h1("Senha alterada")}
    ${spacer(4)}

    ${p(`Olá, <strong style="color:${c.heading}">${o.name}</strong>!`)}
    ${p("Sua senha foi alterada com sucesso. Se foi você, não precisa fazer mais nada.")}

    ${infoBox(`
      <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${c.dangerText};font-family:${sans}">⚠️ Não foi você?</p>
      ${smallNote(`Se você não alterou sua senha, sua conta pode estar comprometida. <strong>Entre em contato imediatamente</strong> respondendo este e-mail ou acesse o painel e altere sua senha agora.`)}
    `, "danger")}
  `);
}

export function passwordChangedText(o: PasswordChangedOpts): string {
  return [
    "Voem. — Senha alterada",
    "",
    `Olá, ${o.name}!`,
    "",
    "Sua senha foi alterada com sucesso.",
    "",
    "NÃO FOI VOCÊ? Responda este e-mail imediatamente — sua conta pode estar comprometida.",
  ].join("\n");
}

// ── Confirmação de presença (template rico — R.3) ──────────────────────────────

export interface RsvpConfirmationOpts {
  name: string;
  coupleNames: string;
  eventTitle: string;
  dateLabel: string;
  ceremonyLabel?: string;
  receptionLabel?: string;
  eventUrl: string;
  editResponseUrl: string;
  muralUrl: string;
}

export function rsvpConfirmationHtml(o: RsvpConfirmationOpts): string {
  const hasLocations = o.ceremonyLabel || o.receptionLabel;
  return wrap(`
    ${h1(o.coupleNames)}
    ${eyebrow(o.eventTitle)}

    <p style="margin:0 0 20px;font-size:20px;font-family:${serif};color:${c.successText}">✓ Presença confirmada!</p>

    ${p(`Olá, <strong style="color:${c.heading}">${o.name}</strong>! Que alegria.`)}
    ${p("Sua presença está confirmada. O casal ficou feliz em saber que você vai estar com eles nesse dia especial.")}

    ${hasLocations || o.dateLabel ? infoBox(`
      ${o.dateLabel ? detail("📅", `<strong>${o.dateLabel}</strong>`) : ""}
      ${o.ceremonyLabel ? detail("💒", `Cerimônia: ${o.ceremonyLabel}`) : ""}
      ${o.receptionLabel ? detail("🎉", `Festa: ${o.receptionLabel}`) : ""}
    `, "success") : ""}

    <div style="text-align:center;margin:32px 0 20px">
      ${btn(o.eventUrl, "Ver meu convite")}
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:${c.muted};font-family:${sans};text-align:center">
      Quer enviar uma foto ou deixar uma mensagem?<br>
      ${btnLink(o.muralUrl, "Visite o mural do evento")}
    </p>

    ${divider()}

    <p style="margin:0;font-size:12px;color:${c.faint};font-family:${sans};text-align:center">
      Mudou de ideia? <a href="${o.editResponseUrl}" style="color:${c.muted};text-decoration:underline">Atualize sua resposta</a>
      &nbsp;·&nbsp; Guarde este e-mail como acesso ao convite.
    </p>
  `);
}

export function rsvpConfirmationText(o: RsvpConfirmationOpts): string {
  return [
    `✓ Presença confirmada — ${o.coupleNames}`,
    "",
    `Olá, ${o.name}!`,
    `Sua presença no ${o.eventTitle} está confirmada.`,
    "",
    o.dateLabel ? `📅 ${o.dateLabel}` : "",
    o.ceremonyLabel ? `💒 Cerimônia: ${o.ceremonyLabel}` : "",
    o.receptionLabel ? `🎉 Festa: ${o.receptionLabel}` : "",
    "",
    `Ver meu convite: ${o.eventUrl}`,
    `Mural do evento: ${o.muralUrl}`,
    "",
    `Mudou de ideia? Atualize sua resposta: ${o.editResponseUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── RSVP Confirmação legada (compat — ainda usada em tests) ────────────────────

export interface RsvpConfirmOpts {
  name: string;
  eventTitle: string;
  coupleNames: string;
  dateLabel: string;
  location: string;
  eventUrl: string;
}

export function rsvpConfirmHtml(o: RsvpConfirmOpts): string {
  return wrap(`
    ${h1(o.coupleNames)}
    ${eyebrow(o.eventTitle)}

    ${p(`Olá, <strong style="color:${c.heading}">${o.name}</strong>!`)}
    ${p("Sua presença foi confirmada. Ficamos felizes em saber que você vai estar com a gente nesse dia especial.")}

    ${o.dateLabel || o.location ? infoBox(`
      ${o.dateLabel ? detail("📅", o.dateLabel) : ""}
      ${o.location ? detail("📍", o.location) : ""}
    `) : ""}

    <div style="text-align:center;margin:32px 0">
      ${btn(o.eventUrl, "Ver meu convite")}
    </div>

    ${smallNote("Guarde este e-mail — o link acima é seu acesso ao convite interativo, com roteiro, local e mais.")}
  `);
}

export function rsvpConfirmText(o: RsvpConfirmOpts): string {
  return [
    `${o.coupleNames} — ${o.eventTitle}`,
    "",
    `Olá, ${o.name}!`,
    "Sua presença foi confirmada. Ficamos felizes em saber que você vai estar com a gente.",
    "",
    o.dateLabel ? `📅 ${o.dateLabel}` : "",
    o.location ? `📍 ${o.location}` : "",
    "",
    `Acesse seu convite: ${o.eventUrl}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

// ── RSVP Declínio ──────────────────────────────────────────────────────────────

export interface RsvpDeclineOpts {
  name: string;
  eventTitle: string;
  coupleNames: string;
  eventUrl: string;
}

export function rsvpDeclineHtml(o: RsvpDeclineOpts): string {
  return wrap(`
    ${h1(o.coupleNames)}
    ${eyebrow(o.eventTitle)}

    ${p(`Olá, <strong style="color:${c.heading}">${o.name}</strong>!`)}
    ${p("Recebemos sua resposta. Sentiremos sua falta, mas entendemos.")}
    ${p("Se mudar de ideia, você pode atualizar sua resposta a qualquer momento:")}

    <div style="text-align:center;margin:32px 0">
      ${btn(`${o.eventUrl}/rsvp`, "Atualizar resposta")}
    </div>
  `);
}

export function rsvpDeclineText(o: RsvpDeclineOpts): string {
  return [
    `${o.coupleNames} — ${o.eventTitle}`,
    "",
    `Olá, ${o.name}!`,
    "Recebemos sua resposta. Sentiremos sua falta.",
    "",
    `Se mudar de ideia, acesse: ${o.eventUrl}/rsvp`,
  ].join("\n");
}

// ── Recuperação de acesso (magic link) ────────────────────────────────────────

export interface RecoveryOpts {
  eventTitle: string;
  coupleNames: string;
  link: string;
}

export function recoveryHtml(o: RecoveryOpts): string {
  return wrap(`
    ${h1(o.coupleNames)}
    ${eyebrow(o.eventTitle)}

    ${p("Você solicitou acesso ao seu convite. Clique no botão abaixo para entrar:")}

    <div style="text-align:center;margin:32px 0">
      ${btn(o.link, "Acessar meu convite")}
    </div>

    ${smallNote("Este link expira em 24 horas e é de uso único. Se não solicitou acesso, ignore este e-mail com segurança.")}
  `);
}

export function recoveryText(o: RecoveryOpts): string {
  return [
    `${o.coupleNames} — ${o.eventTitle}`,
    "",
    "Você solicitou acesso ao seu convite.",
    "",
    `Link de acesso: ${o.link}`,
    "",
    "Este link expira em 24 horas.",
  ].join("\n");
}

// ── Lembrete de evento ─────────────────────────────────────────────────────────

export interface ReminderOpts {
  name: string;
  eventTitle: string;
  coupleNames: string;
  dateLabel: string;
  location: string;
  daysLeft: number;
  eventUrl: string;
}

export function reminderHtml(o: ReminderOpts): string {
  const daysText = o.daysLeft === 1 ? "amanhã" : `em ${o.daysLeft} dias`;
  const headline = o.daysLeft === 1 ? "É amanhã! 🎉" : `Faltam ${o.daysLeft} dias!`;
  return wrap(`
    ${h1(headline)}
    ${spacer(4)}

    ${p(`Olá, <strong style="color:${c.heading}">${o.name}</strong>!`)}
    ${p(`O grande dia de <strong style="color:${c.heading}">${o.coupleNames}</strong> é <strong>${daysText}</strong>. Prepare-se para celebrar!`)}

    ${infoBox(`
      ${detail("📅", o.dateLabel)}
      ${o.location ? detail("📍", o.location) : ""}
    `)}

    <div style="text-align:center;margin:32px 0">
      ${btn(o.eventUrl, "Ver meu convite")}
    </div>

    <p style="margin:0;font-size:14px;color:${c.muted};font-family:${sans};text-align:center">
      Até lá! — ${o.coupleNames}
    </p>
  `);
}

export function reminderText(o: ReminderOpts): string {
  const daysText = o.daysLeft === 1 ? "amanhã" : `em ${o.daysLeft} dias`;
  return [
    `${o.coupleNames} — ${o.eventTitle}`,
    "",
    `Olá, ${o.name}! O grande dia é ${daysText}.`,
    "",
    o.dateLabel,
    o.location,
    "",
    `Acesse seu convite: ${o.eventUrl}`,
  ].filter(Boolean).join("\n");
}

// ── Email em massa (organizador → convidados) ──────────────────────────────────

export interface MassEmailOpts {
  name: string;
  eventTitle: string;
  coupleNames: string;
  subject: string;
  body: string;
  eventUrl: string;
}

export function massEmailHtml(o: MassEmailOpts): string {
  const lines = o.body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => p(l))
    .join("");
  return wrap(`
    ${h1(o.coupleNames)}
    ${eyebrow(o.eventTitle)}

    ${p(`Olá, <strong style="color:${c.heading}">${o.name}</strong>!`)}
    ${lines}

    <div style="text-align:center;margin:32px 0">
      ${btn(o.eventUrl, "Ver meu convite")}
    </div>

    <p style="margin:0;font-size:14px;color:${c.muted};font-family:${sans};text-align:center">
      Com carinho — ${o.coupleNames}
    </p>
  `);
}

export function massEmailText(o: MassEmailOpts): string {
  return [
    `${o.coupleNames} — ${o.eventTitle}`,
    "",
    `Olá, ${o.name}!`,
    "",
    o.body,
    "",
    `Acesse seu convite: ${o.eventUrl}`,
  ].join("\n");
}
