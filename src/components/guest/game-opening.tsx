import Link from "next/link";
import { Countdown } from "@/components/guest/countdown";
import { InviteCodeEntry } from "@/components/guest/invite-code-entry";
import { formatEventDate } from "@/lib/timezone";

// ─── TEXTO DA ABERTURA (aprovado pelo JOs — trocar aqui se mudar o tom) ──────
const OPENING = {
  eyebrow: "NOSSO CONVITE É UM JOGO",
  invite:
    "Entre na vila, descubra as nossas memórias pelo caminho e encontre a sua " +
    "mesa na festa. É rapidinho — e o seu “Confirmar presença” também acontece " +
    "lá dentro, na caixa de correio.",
  start: "▶ COMEÇAR",
  rsvp: "Confirmar presença",
} as const;

// Botões de convite impresso / por código (S4a). Ligados: "Tenho um código" e
// "Escanear QR code" levam ao resgate /<slug>/c/<code>. Ver InviteCodeEntry.
const INVITE_CODES_ENABLED = true;

// Paleta da caixa de diálogo GBA do jogo (item 52) — reaproveitada para a
// abertura ficar coerente com o jogo.
const GBA = {
  cream: "#f7eccf",
  ink: "#2a1d12",
  gold: "#c9a24b",
  brown: "#6b4a2a",
  text: "#3a2a1a",
  nameplateBg: "#2a1d12",
  nameplateFg: "#ffeec2",
};
const PIXEL = "var(--font-press-start), ui-monospace, monospace";

// Abertura do Modo Gamificado: a PRIMEIRA tela que o convidado vê. Tela-título
// de jogo (arte do mapa-múndi ao fundo + moldura pixel GBA), com nomes do casal,
// data, contagem regressiva e o botão "COMEÇAR". O jogo JÁ existe e está no ar —
// nada de "em construção"/"beta" aqui (feedback do JOs, item 58).
export function GameOpening({
  slug,
  coupleNames,
  ceremonyDate,
  timezone,
  rsvpHref,
  jogoHref,
}: {
  slug: string;
  coupleNames: string;
  ceremonyDate: Date;
  timezone: string;
  rsvpHref: string;
  jogoHref: string;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Fundo: recorte do mapa-múndi do próprio jogo, pixelado, escurecido para
          o texto ter contraste. aria-hidden: é decoração. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/game/mapas/mundi.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center 18%",
          imageRendering: "pixelated",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,10,6,0.55) 0%, rgba(14,10,6,0.35) 40%, rgba(14,10,6,0.78) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-sm">
          {/* plaquinha de nome estilo GBA */}
          <div
            className="absolute -top-2 left-4 z-10 px-2 py-1"
            style={{
              background: GBA.nameplateBg,
              color: GBA.nameplateFg,
              border: `2px solid ${GBA.gold}`,
              borderRadius: "3px",
              fontFamily: PIXEL,
              fontSize: "9px",
              letterSpacing: "0.5px",
              boxShadow: "2px 2px 0 rgba(0,0,0,0.35)",
            }}
          >
            {OPENING.eyebrow}
          </div>

          {/* caixa: moldura dupla pixel, cantos dentados, fundo creme */}
          <div
            className="pt-6"
            style={{
              background: GBA.cream,
              border: `4px solid ${GBA.ink}`,
              boxShadow:
                "inset 0 0 0 3px #fff8e8, inset 0 0 0 6px #c9a24b, inset 0 0 0 8px #6b4a2a, 3px 3px 0 rgba(0,0,0,0.4)",
              clipPath:
                "polygon(5px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0 calc(100% - 5px),0 5px)",
              imageRendering: "pixelated",
            }}
          >
            <div className="flex flex-col items-center gap-4 px-5 pb-6 text-center">
              <h1
                className="text-2xl font-semibold leading-tight"
                style={{ fontFamily: "var(--theme-font-heading)", color: GBA.text }}
              >
                {coupleNames}
              </h1>

              <p
                className="text-xs uppercase tracking-wider"
                style={{ fontFamily: PIXEL, fontSize: "8px", color: GBA.brown, lineHeight: 1.6 }}
              >
                {formatEventDate(ceremonyDate, timezone, "EEEE, d 'de' MMMM 'de' yyyy")}
              </p>

              <div style={{ color: GBA.text }}>
                <Countdown targetDate={ceremonyDate} timezone={timezone} />
              </div>

              <p
                style={{
                  fontFamily: "var(--font-lora), Georgia, serif",
                  fontSize: "14px",
                  lineHeight: 1.55,
                  color: GBA.text,
                }}
              >
                {OPENING.invite}
              </p>

              {/* Botão principal: COMEÇAR (fonte pixel) */}
              <Link
                href={jogoHref}
                className="mt-1 flex w-full items-center justify-center px-5 py-4 transition-transform active:translate-y-px"
                style={{
                  fontFamily: PIXEL,
                  fontSize: "13px",
                  color: GBA.nameplateFg,
                  background: GBA.brown,
                  border: `3px solid ${GBA.ink}`,
                  boxShadow: "inset 0 0 0 2px #c9a24b, 2px 2px 0 rgba(0,0,0,0.35)",
                  letterSpacing: "1px",
                }}
              >
                {OPENING.start}
              </Link>

              {/* Secundário discreto: confirmar presença (o RSVP também acontece
                  dentro do jogo, na caixa de correio da Vila) */}
              <Link
                href={rsvpHref}
                className="text-xs underline underline-offset-2"
                style={{ color: GBA.brown }}
              >
                {OPENING.rsvp}
              </Link>

              {/* ── Convite por código / QR impresso (S4a) ──────────────────
                  Ligado por INVITE_CODES_ENABLED. "Tenho um código" e "Escanear
                  QR code" levam ao resgate /<slug>/c/<code>. */}
              {INVITE_CODES_ENABLED && <InviteCodeEntry slug={slug} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
