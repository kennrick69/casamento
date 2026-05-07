// Gera HTML de email com inline styles — compatível com clientes de email.

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e8e8e8">
        <tr><td style="background:#1a1a1a;padding:24px 32px;text-align:center">
          <span style="color:#ffffff;font-size:18px;letter-spacing:0.05em">💍</span>
        </td></tr>
        <tr><td style="padding:32px">
          ${body}
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #e8e8e8;text-align:center">
          <p style="margin:0;font-size:11px;color:#888;font-family:Arial,sans-serif">
            Enviado com ❤️ via <a href="${BASE_URL}" style="color:#888">casamento.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:15px;font-family:Arial,sans-serif;margin:8px 0">${label}</a>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;font-family:Arial,sans-serif">${text}</p>`;
}

function detail(icon: string, text: string): string {
  return `<p style="margin:0 0 8px;font-size:14px;color:#555;font-family:Arial,sans-serif">${icon} ${text}</p>`;
}

// ── RSVP Confirmação ──────────────────────────────────────────────────────

export interface RsvpConfirmOpts {
  name: string;
  eventTitle: string;
  coupleNames: string;
  dateLabel: string;
  location: string;
  eventUrl: string;
}

export function rsvpConfirmHtml(o: RsvpConfirmOpts): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-family:Georgia,serif">${o.coupleNames}</h1>
    <p style="margin:0 0 24px;font-size:13px;color:#888;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em">${o.eventTitle}</p>

    ${p(`Olá, <strong>${o.name}</strong>!`)}
    ${p("Sua presença foi confirmada. Ficamos felizes em saber que você vai estar com a gente nesse dia tão especial.")}

    <div style="background:#f9f9f9;border-radius:6px;padding:16px;margin:16px 0">
      ${o.dateLabel ? detail("📅", o.dateLabel) : ""}
      ${o.location ? detail("📍", o.location) : ""}
    </div>

    <div style="text-align:center;margin:24px 0">
      ${btn(o.eventUrl, "Ver meu convite")}
    </div>

    ${p('<span style="color:#888;font-size:13px">Salve este e-mail — o link acima é seu acesso ao convite interativo, com roteiro, local e mais.</span>')}
  `;
  return wrap(body);
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

// ── RSVP Declínio ─────────────────────────────────────────────────────────

export interface RsvpDeclineOpts {
  name: string;
  eventTitle: string;
  coupleNames: string;
  eventUrl: string;
}

export function rsvpDeclineHtml(o: RsvpDeclineOpts): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-family:Georgia,serif">${o.coupleNames}</h1>
    <p style="margin:0 0 24px;font-size:13px;color:#888;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em">${o.eventTitle}</p>

    ${p(`Olá, <strong>${o.name}</strong>!`)}
    ${p("Recebemos sua resposta. Sentiremos sua falta, mas entendemos.")}
    ${p("Se mudar de ideia, você pode atualizar sua confirmação acessando o link abaixo.")}

    <div style="text-align:center;margin:24px 0">
      ${btn(o.eventUrl + "/rsvp", "Atualizar resposta")}
    </div>
  `;
  return wrap(body);
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

// ── Recuperação de acesso ─────────────────────────────────────────────────

export interface RecoveryOpts {
  eventTitle: string;
  coupleNames: string;
  link: string;
}

export function recoveryHtml(o: RecoveryOpts): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;color:#1a1a1a;font-family:Georgia,serif">${o.coupleNames}</h1>
    <p style="margin:0 0 24px;font-size:13px;color:#888;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em">${o.eventTitle}</p>

    ${p("Você solicitou acesso ao seu convite. Clique no botão abaixo para entrar:")}

    <div style="text-align:center;margin:24px 0">
      ${btn(o.link, "Acessar meu convite")}
    </div>

    ${p('<span style="color:#888;font-size:13px">Este link expira em 24 horas e é de uso único. Se não solicitou, ignore este e-mail.</span>')}
  `;
  return wrap(body);
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
