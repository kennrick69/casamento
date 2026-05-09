import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import {
  wrap, h1, eyebrow, p, infoBox, divider, spacer,
  c, sans, serif,
} from "@/lib/email/templates/_layout";
import { email } from "@/lib/email";

const TO = "kennrick@gmail.com";

function sectionTitle(text: string): string {
  return `<h2 style="margin:0 0 6px;font-size:18px;font-family:${serif};font-weight:normal;color:${c.heading}">${text}</h2>`;
}

function badge(text: string, variant: "red" | "yellow" | "green"): string {
  const styles: Record<string, string> = {
    red:    "background:#fef2f2;color:#991b1b;border:1px solid #fca5a5",
    yellow: "background:#fffbeb;color:#92400e;border:1px solid #fcd34d",
    green:  "background:#f0fdf4;color:#14532d;border:1px solid #86efac",
  };
  return `<span style="display:inline-block;${styles[variant]};border-radius:4px;padding:1px 8px;font-size:11px;font-family:${sans};font-weight:600;letter-spacing:0.06em">${text}</span>`;
}

function trow(icon: string, label: string, note: string): string {
  return `<tr>
    <td style="padding:10px 0;vertical-align:top;font-size:17px;width:28px">${icon}</td>
    <td style="padding:10px 0 10px 8px;font-size:14px;font-family:${sans};color:${c.text};line-height:1.5">
      <strong style="color:${c.heading}">${label}</strong><br>
      <span style="color:${c.muted}">${note}</span>
    </td>
  </tr>`;
}

function checkRow(done: boolean, text: string): string {
  return `<tr>
    <td style="padding:6px 0;vertical-align:top;font-size:14px;width:22px;font-family:${sans}">${done ? "✅" : "⬜"}</td>
    <td style="padding:6px 0 6px 6px;font-size:14px;font-family:${sans};color:${c.text};line-height:1.4">${text}</td>
  </tr>`;
}

function numRow(n: number, title: string, sub: string): string {
  return `<tr>
    <td style="padding:8px 0;vertical-align:top;font-size:14px;font-family:${sans};color:${c.muted};width:26px;font-weight:700">${n}.</td>
    <td style="padding:8px 0 8px 4px;font-size:14px;font-family:${sans};color:${c.text};line-height:1.45">
      <strong style="color:${c.heading}">${title}</strong><br>
      <span style="color:${c.muted}">${sub}</span>
    </td>
  </tr>`;
}

function t(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">${rows}</table>`;
}

function buildHtml(today: string, fileDates: Record<string, string>): string {
  const body = [
    eyebrow(`Voem. — Resumo executivo · ${today}`),
    h1("Pontos pendentes do projeto"),
    p(`Gerado em <strong>${today}</strong>. Consolida configurações faltantes, checklist de testes manuais, bugs pendentes e próximos passos. Nenhuma credencial incluída.`),
    p(`<span style="color:${c.muted};font-size:12px">Fontes: STATUS.md (${fileDates.status}), tech-debt.md (${fileDates.techDebt}), teste-noturno.md (${fileDates.testeNoturno})</span>`),

    divider(),

    sectionTitle("1 — Configurações pendentes (não-código)"),
    spacer(12),
    infoBox(
      `<p style="margin:0 0 10px;font-size:13px;font-family:${sans};color:${c.muted}">Variáveis não configuradas no Railway. Código pronto — só falta adicionar os valores no painel.</p>` +
      t([
        trow("🔴", "Sentry DSN",
          "Criar projeto em sentry.io → Client Keys → copiar DSN. Definir SENTRY_DSN e NEXT_PUBLIC_SENTRY_DSN no Railway. Plano grátis: 5k events/mês."),
        trow("🔴", "Backblaze B2 — backup off-site",
          "4 variáveis: B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_ENDPOINT. Criar bucket em backblaze.com. Sem B2, apenas volume Railway (60 dias) protege os dados."),
        trow("🟡", "Spotify",
          "SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET (developers.spotify.com → Create app). Sem elas, busca de músicas fica desabilitada — campo manual aparece como fallback."),
        trow("🟡", "Domínio — renovação",
          "Verificar renovação automática até 23/04/2027. Sem domínio, Railway usa URL padrão."),
        trow("🔴", "DEV_TOOLS_ENABLED=false",
          "Obrigatório antes de onboarding de qualquer casal externo. /admin/dev-tools expõe tokens de verificação em texto puro. Definir a variável retorna 404 automaticamente."),
        trow("🟡", "GitHub Actions: Node 20 → 22",
          "Deadline: junho/2026. Trocar node-version nos 3 jobs do CI (unit, typecheck, smoke)."),
      ].join("")),
      "default"
    ),

    divider(),

    sectionTitle("2 — Checklist de teste profundo (top 20 críticos)"),
    spacer(8),
    p(`Testar em <strong>produção</strong> (joseeleticia.com). Marcar ao passar.`),
    spacer(4),
    t([
      checkRow(false, "<strong>Login / Signup</strong> — credenciais corretas e incorretas, barra de força, rate limit, Turnstile"),
      checkRow(false, "<strong>Verificação de email</strong> — link funciona, reenvio com countdown 60s, token expirado retorna erro correto"),
      checkRow(false, "<strong>Password reset</strong> — anti-enumeration, força de senha ≥ score 2, invalidação de sessões em outros devices"),
      checkRow(false, "<strong>Onboarding wizard</strong> — 3 telas, step clampado, redirect sem sessão"),
      checkRow(false, "<strong>Wizard de criação de evento</strong> — 4 passos, validação inline pt-BR, auto-save onBlur, guard step=4 em eventos publicados"),
      checkRow(false, "<strong>RSVP do convidado</strong> — formulário completo (+1, dietético, mensagem), email de confirmação com data/local/links"),
      checkRow(false, "<strong>Mural de fotos</strong> — upload com compressão client-side, modal com swipe/teclado, reações toggleáveis por sessionId"),
      checkRow(false, "<strong>Chat em tempo real</strong> — Pusher, typing indicator, reações por duplo clique, badge Casal para organizadores"),
      checkRow(false, "<strong>Playlist com Spotify</strong> — busca debounced 400ms, preview 30s, limite 3 sugestões/convidado, modo manual fallback"),
      checkRow(false, "<strong>Gincana</strong> — barra de progresso por faixa de pontos, missões customizadas no admin, QR code check-in, ranking top-3 com medalhas"),
      checkRow(false, "<strong>Plano de mesas</strong> — drag-and-drop, export PDF, mesa exibida na tela de sucesso do RSVP"),
      checkRow(false, "<strong>Save-the-date PDF</strong> — gerar ZIP (3 templates, QR por convidado), limite 500 convidados"),
      checkRow(false, "<strong>Importação CSV/XLSX</strong> — preview 10 linhas, deduplicação (pular ou atualizar), relatório de erros por linha"),
      checkRow(false, "<strong>Analytics do evento</strong> — 4 KPIs, gráfico de barras por data, top fotos e músicas"),
      checkRow(false, "<strong>Agradecimentos</strong> — template automático por convidado, editar nota, copiar, marcar enviado, barra de progresso"),
      checkRow(false, "<strong>Modo TV fullscreen</strong> — slideshow 8s, teclado ←/→/Space, toque nas bordas, live banner via Pusher"),
      checkRow(false, "<strong>Compartilhamento social</strong> — WhatsApp (wa.me), copiar link feedback 2,5s, QR code modal gerado corretamente"),
      checkRow(false, "<strong>Editor visual de convite</strong> — paleta de cores, tipografia, preview no iframe, persistência após reload"),
      checkRow(false, "<strong>Headers de segurança</strong> — securityheaders.com → nota A (HSTS, X-Frame-Options, nosniff, CSP)"),
      checkRow(false, "<strong>Health check + backups</strong> — /admin/saude com cards atualizando a cada 30s, /admin/saude/backups lista arquivos e AuthLog"),
    ].join("")),

    divider(),

    sectionTitle("3 — Bugs conhecidos pendentes"),
    spacer(8),
    infoBox(
      t([
        trow("⚠️", "Storage hardcoded para Railway Volume",
          "STORAGE_PROVIDER env var é ignorada — código usa RailwayVolumeStorage diretamente. Migração para R2 não é plug-and-play sem ativar a leitura da variável em src/lib/storage/index.ts."),
        trow("⚠️", "Campos legados de local no model Event",
          "ceremony/receptionLocation/Address e mapsLink duplicados entre campos planos e EventLocation. Remover após confirmar migração completa para /locais."),
        trow("⚠️", "isPublic=false em EventLocation não validado",
          "Locais marcados como privados ainda aparecem para todos os convidados na página pública. Aguarda sistema de tags de convidados."),
        trow("⚠️", "aria-expanded sem aria-controls em add-song-form.tsx",
          "Warning de acessibilidade WCAG nível AAA. Não bloqueia CI. Adicionar aria-controls apontando para o combobox de resultados Spotify."),
        trow("⚠️", "Tabelas de /privacidade sem overflow-x-auto",
          "Scroll horizontal em viewports < 360px. Baixo impacto. Fix: overflow-x-auto na div wrapper das tabelas da página legal."),
        trow("⚠️", "/admin/dev-tools acessível em produção",
          "Expõe tokens de verificação em texto puro. Fix imediato: DEV_TOOLS_ENABLED=false no Railway."),
      ].join("")),
      "default"
    ),

    divider(),

    sectionTitle("4 — Próximos passos sugeridos (por prioridade)"),
    spacer(8),
    t([
      numRow(1, "Configurar Sentry + Backblaze B2 + Spotify",
        "Máximo impacto com mínimo esforço. 9 variáveis de ambiente no Railway."),
      numRow(2, "DEV_TOOLS_ENABLED=false no Railway",
        "Bloqueador de segurança. 1 env var, 0 código. Obrigatório antes de qualquer casal externo."),
      numRow(3, "Testes noturnos manuais (seção 2 acima)",
        "20 fluxos críticos listados. Build all day, test at night."),
      numRow(4, "Arte final da landing — substituir ProtoScene greybox",
        "Substituir bonecos CSS pelo cenário final (Midjourney + aprovação da noiva). Remover banner prototype."),
      numRow(5, "Migração storage Railway Volume → Cloudflare R2",
        "Gatilho: 100 fotos ou 30 dias antes do evento. StorageProvider abstrata já pronta."),
      numRow(6, "GitHub Actions: Node 20 → 22",
        "Deadline junho/2026. Trocar node-version nos 3 jobs do CI."),
      numRow(7, "Lighthouse mobile em produção",
        "Meta: > 85 em todas as páginas críticas. @lhci/cli já configurado no CI."),
      numRow(8, "Auditoria axe-core completa",
        "Rodar contra /login, /[slug], /[slug]/rsvp. Corrigir violações WCAG AA antes de abrir para convidados reais."),
      numRow(9, "Tags de convidados (Fase 3)",
        "Grupos: família, amigos, trabalho. Habilita visibilidade de locais por grupo (isPublic=false)."),
      numRow(10, "Lembretes WhatsApp via Twilio (Fase 5)",
        "Email cobre o caso de uso atual. Twilio requer template aprovado pelo Meta."),
    ].join("")),

    spacer(16),
    infoBox(
      `<p style="margin:0;font-size:13px;font-family:${sans};color:${c.muted}">
        ${badge("115 testes passando", "green")} &nbsp;
        ${badge("TypeScript 0 erros", "green")} &nbsp;
        ${badge("ESLint 0 erros", "green")} &nbsp;
        ${badge("Sentry sem DSN", "red")} &nbsp;
        ${badge("B2 sem credenciais", "red")} &nbsp;
        ${badge("Storage hardcoded Railway", "yellow")}
      </p>`,
      "default"
    ),

    spacer(8),
    p(`Painel admin: <strong>joseeleticia.com/admin</strong>`),
  ].join("\n");

  return wrap(body);
}

function readDocMeta(relativePath: string): string {
  try {
    const content = readFileSync(join(process.cwd(), relativePath), "utf8");
    const lines = content.split("\n").length;
    return `${lines} linhas`;
  } catch {
    return "não encontrado";
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const subject = `Pontos pendentes do projeto Voem — ${today}`;

  const fileDates = {
    status:       readDocMeta("docs/STATUS.md"),
    techDebt:     readDocMeta("docs/tech-debt.md"),
    testeNoturno: readDocMeta("docs/teste-noturno.md"),
  };

  const html = buildHtml(today, fileDates);

  try {
    const result = await email.send({ to: TO, subject, html });
    return NextResponse.json({ ok: true, messageId: result.id, to: TO, subject });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
