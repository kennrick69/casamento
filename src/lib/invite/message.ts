// Mensagem do convite (S4a). O MESMO conteúdo vira texto do WhatsApp e corpo do
// e-mail — uma fonte só, pra não divergir. Puro (sem DB): o contexto é montado
// no servidor (buildInviteContext em ./context.ts).

import { wrap, h1, eyebrow, p, smallNote, btn, detail, infoBox, c } from "@/lib/email/templates/_layout";

export interface InviteContext {
  firstName: string;
  coupleNames: string;
  dateLabel: string; // ex.: "sábado, 29 de maio de 2027"
  timeLabel?: string | null; // ex.: "16h00"
  locationLine?: string | null; // ex.: "Espaço Villa Bosque — Rua X, 123"
  mapsLink?: string | null; // rota no Google Maps do local cadastrado
  siteUrl: string; // ex.: https://joseeleticia.com/joseeleticia
  personalLink: string; // ex.: https://joseeleticia.com/joseeleticia/c/ABCD2345
  code: string; // já formatado p/ leitura (ABCD-2345)
}

// Texto puro (WhatsApp). Emojis OK aqui (é mensagem, não terminal/painel).
export function buildInviteText(ctx: InviteContext): string {
  const quando = ctx.timeLabel ? `${ctx.dateLabel} às ${ctx.timeLabel}` : ctx.dateLabel;
  const lines = [
    `Olá, ${ctx.firstName}! 💛`,
    "",
    `Você está convidado(a) para o casamento de ${ctx.coupleNames}.`,
    "",
    `🗓️ ${quando}`,
  ];
  if (ctx.locationLine) lines.push(`📍 ${ctx.locationLine}`);
  if (ctx.mapsLink) lines.push(`🗺️ Como chegar: ${ctx.mapsLink}`);
  lines.push(
    "",
    "Nosso convite é um joguinho! Entre no jogo para escolher o seu lugar e descobrir a nossa história:",
    ctx.personalLink,
    "",
    `Se o link não abrir, entre em ${ctx.siteUrl} e digite o seu código: ${ctx.code}`
  );
  return lines.join("\n");
}

// Link wa.me com a mensagem pronta (o organizador só aperta enviar).
export function buildWhatsappHref(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

// Versão HTML (e-mail), mesmo conteúdo do texto, no layout de e-mail do site.
export function buildInviteEmailHtml(ctx: InviteContext): string {
  const quando = ctx.timeLabel ? `${ctx.dateLabel} às ${ctx.timeLabel}` : ctx.dateLabel;
  const details = [
    detail("🗓️", quando),
    ctx.locationLine ? detail("📍", ctx.locationLine) : "",
    ctx.mapsLink ? detail("🗺️", `<a href="${ctx.mapsLink}" style="color:${c.heading}">Como chegar (Google Maps)</a>`) : "",
  ]
    .filter(Boolean)
    .join("");

  return wrap(`
    ${eyebrow(ctx.coupleNames)}
    ${h1(`Olá, ${ctx.firstName}!`)}
    ${p(`Você está convidado(a) para o casamento de <strong style="color:${c.heading}">${ctx.coupleNames}</strong>.`)}
    ${infoBox(details)}
    ${p("Nosso convite é um joguinho! Entre no jogo para escolher o seu lugar e descobrir a nossa história:")}
    <div style="text-align:center;margin:28px 0">
      ${btn(ctx.personalLink, "Entrar no nosso convite-jogo")}
    </div>
    ${smallNote(`Se o botão não abrir, acesse <strong style="color:${c.heading}">${ctx.siteUrl}</strong> e digite o seu código: <strong style="color:${c.heading}">${ctx.code}</strong>`)}
  `);
}
