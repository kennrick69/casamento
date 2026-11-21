"use client";

import { useEffect, useRef, useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { enterWithPersonalCode, redeemBlankCode } from "./actions";
import { getAuthenticationOptions, completeAuthentication } from "../../jogo/actions";

export type RedeemState =
  | { kind: "invalid" }
  | { kind: "personal"; firstName: string }
  | { kind: "blank_free"; maxCompanions: number }
  | { kind: "blank_claimed"; claimantName: string };

// Paleta GBA (mesma da abertura/caixa de diálogo) p/ o resgate ficar coerente.
const CREAM = "#f7eccf";
const INK = "#2a1d12";
const BROWN = "#6b4a2a";
const TEXT = "#3a2a1a";
const NAMEPLATE_FG = "#ffeec2";
const PIXEL = "var(--font-press-start), ui-monospace, monospace";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-10" style={{ background: "#1b2838" }}>
      <div className="relative w-full max-w-sm">
        <div
          className="absolute -top-2 left-4 z-10 px-2 py-1"
          style={{
            background: INK,
            color: NAMEPLATE_FG,
            border: `2px solid #c9a24b`,
            borderRadius: "3px",
            fontFamily: PIXEL,
            fontSize: "9px",
            letterSpacing: "0.5px",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.35)",
          }}
        >
          {title}
        </div>
        <div
          className="pt-6"
          style={{
            background: CREAM,
            border: `4px solid ${INK}`,
            boxShadow: "inset 0 0 0 3px #fff8e8, inset 0 0 0 6px #c9a24b, inset 0 0 0 8px #6b4a2a, 3px 3px 0 rgba(0,0,0,0.4)",
            clipPath: "polygon(5px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0 calc(100% - 5px),0 5px)",
          }}
        >
          <div className="flex flex-col gap-4 px-5 pb-6" style={{ color: TEXT }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const pixelBtn: React.CSSProperties = {
  fontFamily: PIXEL,
  fontSize: "12px",
  color: NAMEPLATE_FG,
  background: BROWN,
  border: `3px solid ${INK}`,
  boxShadow: "inset 0 0 0 2px #c9a24b, 2px 2px 0 rgba(0,0,0,0.35)",
  letterSpacing: "0.5px",
};

export function RedeemClient({
  slug,
  code,
  coupleNames,
  state,
}: {
  slug: string;
  code: string;
  coupleNames: string;
  state: RedeemState;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supportsPasskey = useSyncExternalStore(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => true
  );

  // ── Código pessoal: entra automaticamente ───────────────────────────────
  const ranRef = useRef(false);
  useEffect(() => {
    if (state.kind !== "personal" || ranRef.current) return;
    ranRef.current = true;
    (async () => {
      const r = await enterWithPersonalCode(slug, code);
      if (r.ok) router.replace(r.next);
      else setError(r.message);
    })();
  }, [state, slug, code, router]);

  // ── Resgate de código em branco (nome + família) ─────────────────────────
  const maxCompanions = state.kind === "blank_free" ? state.maxCompanions : 0;
  const [name, setName] = useState("");
  const [companions, setCompanions] = useState<{ name: string; child: boolean }[]>([]);

  function addCompanion() {
    if (companions.length >= maxCompanions) return;
    setCompanions((c) => [...c, { name: "", child: false }]);
  }
  function updateCompanion(i: number, patch: Partial<{ name: string; child: boolean }>) {
    setCompanions((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeCompanion(i: number) {
    setCompanions((c) => c.filter((_, idx) => idx !== i));
  }

  function submitBlank() {
    setError(null);
    const cleanName = name.trim();
    if (!cleanName) return setError("Diga o seu nome.");
    const comps = companions
      .map((c) => ({ name: c.name.trim(), type: c.child ? ("CHILD" as const) : ("ADULT" as const) }))
      .filter((c) => c.name.length > 0);
    startTransition(async () => {
      const r = await redeemBlankCode(slug, code, cleanName, JSON.stringify(comps));
      if (r.ok) router.replace(r.next);
      else setError(r.message);
    });
  }

  // ── Código já usado: passkey ("é você?") ─────────────────────────────────
  function loginPasskey() {
    setError(null);
    startTransition(async () => {
      const opt = await getAuthenticationOptions(slug);
      if (!opt.ok) return setError(opt.message);
      let resp;
      try {
        resp = await startAuthentication({ optionsJSON: opt.options });
      } catch {
        return setError("Não foi possível usar o passkey neste aparelho.");
      }
      const res = await completeAuthentication(slug, resp);
      if (res.ok) router.replace(`/${slug}/jogo`);
      else setError(res.message);
    });
  }

  const errorBox = error && (
    <p className="text-sm" style={{ color: "#8a2f24" }}>
      {error}
    </p>
  );

  // ── Render por estado ────────────────────────────────────────────────────
  if (state.kind === "personal") {
    return (
      <Card title="CONVITE">
        <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--theme-font-heading)" }}>
          {coupleNames}
        </h1>
        <p className="text-sm">
          {error ? "Não consegui te identificar automaticamente." : `Entrando como ${state.firstName}…`}
        </p>
        {errorBox}
        {error && (
          <Link href={`/${slug}/jogo`} className="flex items-center justify-center px-4 py-3" style={pixelBtn}>
            ENTRAR NO JOGO
          </Link>
        )}
      </Card>
    );
  }

  if (state.kind === "blank_free") {
    return (
      <Card title="SEU CONVITE">
        <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--theme-font-heading)" }}>
          {coupleNames}
        </h1>
        <p className="text-sm">Que bom que você veio! Como você se chama?</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          maxLength={120}
          className="w-full h-11 px-3 rounded-md border-2 text-sm"
          style={{ borderColor: BROWN, background: "#fff8e8", color: TEXT }}
        />

        {maxCompanions > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Quem vem com você? (opcional)</p>
            {companions.map((comp, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={comp.name}
                  onChange={(e) => updateCompanion(i, { name: e.target.value })}
                  placeholder={`Acompanhante ${i + 1}`}
                  maxLength={80}
                  className="flex-1 h-10 px-3 rounded-md border-2 text-sm"
                  style={{ borderColor: BROWN, background: "#fff8e8", color: TEXT }}
                />
                <label className="flex items-center gap-1 text-xs" title="É criança">
                  <input type="checkbox" checked={comp.child} onChange={(e) => updateCompanion(i, { child: e.target.checked })} />
                  criança
                </label>
                <button type="button" onClick={() => removeCompanion(i)} className="text-xs underline" style={{ color: BROWN }}>
                  remover
                </button>
              </div>
            ))}
            {companions.length < maxCompanions && (
              <button type="button" onClick={addCompanion} className="text-sm underline self-start" style={{ color: BROWN }}>
                + adicionar acompanhante
              </button>
            )}
          </div>
        )}

        {errorBox}
        <button
          type="button"
          onClick={submitBlank}
          disabled={isPending}
          className="flex items-center justify-center px-4 py-3 disabled:opacity-60"
          style={pixelBtn}
        >
          {isPending ? "ENTRANDO…" : "▶ CRIAR MEU PERSONAGEM"}
        </button>
      </Card>
    );
  }

  if (state.kind === "blank_claimed") {
    return (
      <Card title="CONVITE">
        <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--theme-font-heading)" }}>
          {coupleNames}
        </h1>
        <p className="text-sm">
          Este convite já foi usado por <strong>{state.claimantName}</strong>. É você?
        </p>
        {supportsPasskey ? (
          <button
            type="button"
            onClick={loginPasskey}
            disabled={isPending}
            className="flex items-center justify-center px-4 py-3 disabled:opacity-60"
            style={pixelBtn}
          >
            {isPending ? "…" : "SIM, SOU EU — ENTRAR"}
          </button>
        ) : (
          <Link href={`/${slug}/jogo`} className="flex items-center justify-center px-4 py-3" style={pixelBtn}>
            ENTRAR PELO JOGO
          </Link>
        )}
        {errorBox}
        <Link href={`/${slug}`} className="text-sm underline self-center" style={{ color: BROWN }}>
          Não sou eu
        </Link>
      </Card>
    );
  }

  // invalid
  return (
    <Card title="CONVITE">
      <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--theme-font-heading)" }}>
        {coupleNames}
      </h1>
      <p className="text-sm">Convite inválido ou desativado. Confira o código do seu convite.</p>
      <Link href={`/${slug}/jogo`} className="flex items-center justify-center px-4 py-3" style={pixelBtn}>
        TENHO OUTRO CÓDIGO
      </Link>
      <Link href={`/${slug}`} className="text-sm underline self-center" style={{ color: BROWN }}>
        Voltar ao convite
      </Link>
    </Card>
  );
}
