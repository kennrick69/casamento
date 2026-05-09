// Email layout primitives — inline CSS compatível com Gmail, Outlook, Apple Mail.
// Paleta rose-to-slate. Mobile-first, max-width 600px.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Tokens ────────────────────────────────────────────────────────────────────

const c = {
  pageBg:        "#f1f0ef",
  white:         "#ffffff",
  headerFrom:    "#881337", // rose-900
  headerTo:      "#0f172a", // slate-900
  heading:       "#0f172a",
  text:          "#334155", // slate-700
  muted:         "#64748b", // slate-500
  faint:         "#94a3b8", // slate-400
  border:        "#e2e8f0", // slate-200
  surfaceMuted:  "#f8fafc", // slate-50
  accent:        "#9f1239", // rose-800
  successText:   "#14532d",
  successBg:     "#f0fdf4",
  successBorder: "#86efac",
  warningText:   "#92400e",
  warningBg:     "#fffbeb",
  warningBorder: "#fcd34d",
  dangerText:    "#991b1b",
  dangerBg:      "#fef2f2",
  dangerBorder:  "#fca5a5",
} as const;

// Gmail/Apple Mail — system sans; Outlook fallback to Arial
const sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
// Email-safe serif, closest to Cormorant Garamond
const serif = "Georgia,'Times New Roman',serif";

// ── Layout wrapper ─────────────────────────────────────────────────────────────

export function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Voem.</title>
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    @media only screen and (max-width:640px){
      .ew{padding:0 !important}
      .ec{border-radius:0 !important}
      .ep{padding:32px 24px !important}
      .ef{padding:20px 24px !important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${c.pageBg} !important;color:${c.text} !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">

  <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color:${c.pageBg};padding:40px 16px"><![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="ew"
    style="background-color:${c.pageBg} !important;padding:40px 16px">
    <tr><td align="center">

      <!-- card -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="ec"
        style="max-width:600px;background-color:${c.white} !important;border-radius:12px;overflow:hidden;border:1px solid ${c.border}">

        <!-- header: gradient rose → slate (solid fallback for Outlook) -->
        <tr>
          <td align="center" bgcolor="${c.headerFrom}"
            style="background-color:${c.headerFrom};background-image:linear-gradient(135deg,${c.headerFrom} 0%,${c.headerTo} 100%);padding:44px 48px">
            <span style="display:block;font-size:34px;font-family:${serif};font-weight:normal;font-style:italic;color:${c.white};letter-spacing:0.05em;line-height:1;-webkit-text-stroke:0.8px #fb7185">Voem.</span>
            <span style="display:block;margin-top:8px;font-size:11px;font-family:${sans};color:rgba(255,255,255,0.55);letter-spacing:0.14em;text-transform:uppercase">Convites de casamento</span>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td class="ep" style="padding:48px 48px 40px">
            ${body}
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td class="ef"
            style="background-color:${c.surfaceMuted} !important;border-top:1px solid ${c.border};padding:24px 48px;text-align:center">
            <p style="margin:0 0 6px;font-size:12px;color:${c.faint};font-family:${sans}">
              <a href="${APP_URL}" style="color:${c.faint};text-decoration:none">Voem.</a> · Convites de casamento
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;font-family:${sans};line-height:1.6">
              Este é um e-mail transacional enviado automaticamente.<br>
              Se não reconhece esta mensagem, pode ignorá-la com segurança.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</body>
</html>`;
}

// ── Primitivos de conteúdo ─────────────────────────────────────────────────────

export function h1(text: string): string {
  return `<h1 style="margin:0 0 6px;font-size:28px;line-height:1.25;color:${c.heading} !important;font-family:${serif};font-weight:normal">${text}</h1>`;
}

export function eyebrow(text: string): string {
  return `<p style="margin:0 0 24px;font-size:11px;color:${c.muted} !important;font-family:${sans};text-transform:uppercase;letter-spacing:0.12em">${text}</p>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${c.text} !important;font-family:${sans}">${text}</p>`;
}

export function smallNote(text: string): string {
  return `<p style="margin:0;font-size:12px;line-height:1.65;color:${c.muted} !important;font-family:${sans}">${text}</p>`;
}

// CTA primário — altura mínima 44px (padding 16px top/bottom + 14px font-size ≈ 46px)
export function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:${c.accent} !important;color:${c.white} !important;text-decoration:none;padding:16px 36px;border-radius:8px;font-size:15px;font-family:${sans};font-weight:600;letter-spacing:0.02em;line-height:1.2;border:2px solid ${c.accent} !important;mso-padding-alt:0">${label}</a>`;
}

// Link secundário discreto
export function btnLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${c.accent};font-family:${sans};font-size:14px;font-weight:500;text-decoration:none">${label} →</a>`;
}

// Linha ícone + texto (datas, locais, etc.)
export function detail(icon: string, text: string): string {
  return `<p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:${c.text} !important;font-family:${sans}"><span style="margin-right:8px">${icon}</span>${text}</p>`;
}

// Caixa colorida de destaque
type BoxVariant = "default" | "success" | "warning" | "danger";
export function infoBox(content: string, variant: BoxVariant = "default"): string {
  const map: Record<BoxVariant, { bg: string; border: string; left?: string }> = {
    default:  { bg: c.surfaceMuted, border: c.border },
    success:  { bg: c.successBg,   border: c.successBorder, left: c.successText },
    warning:  { bg: c.warningBg,   border: c.warningBorder, left: c.warningText },
    danger:   { bg: c.dangerBg,    border: c.dangerBorder,  left: c.dangerText  },
  };
  const { bg, border, left } = map[variant];
  const leftBorder = left ? `border-left:4px solid ${left};border-radius:0 8px 8px 0` : `border-radius:8px`;
  return `<div style="background-color:${bg};border:1px solid ${border};${leftBorder};padding:20px 24px;margin:20px 0">${content}</div>`;
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${c.border};margin:28px 0">`;
}

export function spacer(px: number): string {
  return `<div style="height:${px}px;line-height:${px}px;font-size:1px">&nbsp;</div>`;
}

// Expõe cores e fontes para os templates que precisam de estilos customizados
export { c, sans, serif };
