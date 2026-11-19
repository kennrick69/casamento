"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import { buttonVariants } from "@/components/ui/button";
import { Gamepad2, Construction } from "lucide-react";
import {
  enterAsVisitor,
  identifyByNamePhone,
  getRegistrationOptions,
  completeRegistration,
  getAuthenticationOptions,
  completeAuthentication,
  claimMyCharacter,
} from "./actions";

// ─── Modo Gamificado · Tela de identidade (S2, client) ──────────────────────
// Orquestra o WebAuthn no navegador (@simplewebauthn/browser) conversando com
// as server actions. O servidor é a autoridade: o browser só coleta o passkey.

export type IdentityState = {
  identified: boolean;
  playerName: string | null;
  isVisitor: boolean;
  hasPasskey: boolean;
  characterClaimed: boolean;
};

function friendlyWebAuthnError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") return "Operação cancelada ou expirada.";
  if (name === "InvalidStateError") return "Este aparelho já tem um passkey desta conta.";
  return "Não foi possível usar o passkey neste aparelho.";
}

export function JogoIdentityClient({
  slug,
  coupleNames,
  recoverHref,
  state,
}: {
  slug: string;
  coupleNames: string;
  recoverHref: string;
  state: IdentityState;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [idName, setIdName] = useState("");
  const [idPhone, setIdPhone] = useState("");
  const [claimName, setClaimName] = useState(state.playerName ?? "");

  // Suporte a passkey só pode ser lido no browser. useSyncExternalStore lê o
  // valor do cliente após a hidratação sem setState-em-effect nem mismatch
  // (snapshot do servidor = otimista `true`; o cliente corrige se não suportar).
  const supportsPasskey = useSyncExternalStore(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => true
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onLoginPasskey() {
    setMsg(null);
    const opt = await getAuthenticationOptions(slug);
    if (!opt.ok) return setMsg({ kind: "err", text: opt.message });
    let resp;
    try {
      resp = await startAuthentication({ optionsJSON: opt.options });
    } catch (e) {
      return setMsg({ kind: "err", text: friendlyWebAuthnError(e) });
    }
    const res = await completeAuthentication(slug, resp);
    if (res.ok) {
      setMsg({ kind: "ok", text: "Bem-vindo de volta!" });
      refresh();
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  async function onRegisterPasskey() {
    setMsg(null);
    const opt = await getRegistrationOptions(slug);
    if (!opt.ok) return setMsg({ kind: "err", text: opt.message });
    let resp;
    try {
      resp = await startRegistration({ optionsJSON: opt.options });
    } catch (e) {
      return setMsg({ kind: "err", text: friendlyWebAuthnError(e) });
    }
    const nickname =
      typeof navigator !== "undefined" ? navigator.platform || undefined : undefined;
    const res = await completeRegistration(slug, resp, nickname);
    if (res.ok) {
      setMsg({ kind: "ok", text: "Passkey criado neste aparelho!" });
      refresh();
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  async function onIdentify() {
    setMsg(null);
    const res = await identifyByNamePhone(slug, idName, idPhone);
    if (res.ok) refresh();
    else setMsg({ kind: "err", text: res.message });
  }

  async function onEnterVisitor() {
    setMsg(null);
    const res = await enterAsVisitor(slug, visitorName);
    if (res.ok) refresh();
    else setMsg({ kind: "err", text: res.message });
  }

  async function onClaim() {
    setMsg(null);
    const res = await claimMyCharacter(slug, claimName);
    if (res.ok) {
      setMsg({ kind: "ok", text: "Boneco reivindicado!" });
      refresh();
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  }

  const card =
    "rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] p-5 flex flex-col gap-3 w-full max-w-sm";
  const label = "text-xs uppercase tracking-wider text-[var(--theme-secondary)]";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 gap-6 text-center">
      <div className="flex flex-col gap-1">
        <Gamepad2 className="size-10 mx-auto text-[var(--theme-primary)]" aria-hidden />
        <h1
          className="text-2xl font-semibold text-[var(--theme-foreground)]"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          {coupleNames}
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">Modo jogo — identificação</p>
      </div>

      {msg && (
        <p
          role="status"
          className={`text-sm max-w-sm ${msg.kind === "ok" ? "text-[var(--theme-primary)]" : "text-red-500"}`}
        >
          {msg.kind === "ok" ? "[OK] " : "[ERRO] "}
          {msg.text}
        </p>
      )}

      {!state.identified ? (
        <>
          <div className={card}>
            <span className={label}>Novo jogo</span>
            <p className="text-sm text-[var(--theme-secondary)]">
              Entre com o nome e o celular que você deu no convite.
            </p>
            <input
              type="text"
              value={idName}
              onChange={(e) => setIdName(e.target.value)}
              placeholder="Seu nome (como no convite)"
              maxLength={120}
              autoComplete="name"
              className="h-11 rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-foreground)]"
            />
            <input
              type="tel"
              inputMode="tel"
              value={idPhone}
              onChange={(e) => setIdPhone(e.target.value)}
              placeholder="Celular com DDD"
              maxLength={30}
              autoComplete="tel"
              className="h-11 rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-foreground)]"
            />
            <button
              type="button"
              disabled={pending || idName.trim().length === 0 || idPhone.trim().length === 0}
              onClick={onIdentify}
              className={buttonVariants({ className: "h-11 justify-center" })}
            >
              Começar
            </button>
          </div>

          {supportsPasskey && (
            <div className={card}>
              <span className={label}>Já tenho passkey</span>
              <button
                type="button"
                disabled={pending}
                onClick={onLoginPasskey}
                className={buttonVariants({ className: "h-11 justify-center" })}
              >
                Entrar com passkey
              </button>
            </div>
          )}

          <div className={card}>
            <span className={label}>Já confirmei presença</span>
            <p className="text-sm text-[var(--theme-secondary)]">
              Receba um link de acesso no seu e-mail (o mesmo do convite).
            </p>
            <Link
              href={recoverHref}
              className={buttonVariants({ variant: "outline", className: "h-11 justify-center" })}
            >
              Entrar com e-mail
            </Link>
          </div>

          <div className={card}>
            <span className={label}>Sou visitante</span>
            <p className="text-sm text-[var(--theme-secondary)]">
              Entre para explorar sem estar na lista de convidados.
            </p>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Como quer ser chamado?"
              maxLength={40}
              className="h-11 rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-foreground)]"
            />
            <button
              type="button"
              disabled={pending || visitorName.trim().length === 0}
              onClick={onEnterVisitor}
              className={buttonVariants({ variant: "outline", className: "h-11 justify-center" })}
            >
              Entrar como visitante
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={card}>
            <span className={label}>Você está dentro</span>
            <p className="text-sm text-[var(--theme-foreground)]">
              {state.playerName ? `Olá, ${state.playerName}!` : "Identificado."}
              {state.isVisitor ? " (visitante)" : ""}
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <input
                type="text"
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
                placeholder="Seu primeiro nome no jogo"
                maxLength={40}
                className="h-11 rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 text-sm text-[var(--theme-foreground)]"
              />
              <button
                type="button"
                disabled={pending || claimName.trim().length === 0}
                onClick={onClaim}
                className={buttonVariants({ className: "h-11 justify-center" })}
              >
                {state.characterClaimed ? "Atualizar meu boneco" : "Reivindicar meu boneco"}
              </button>
            </div>
          </div>

          <Link
            href={`/${slug}/jogo/personagem`}
            className={buttonVariants({
              variant: state.characterClaimed ? "outline" : "default",
              className: "h-12 justify-center text-base font-semibold",
            })}
          >
            {state.characterClaimed ? "Editar meu personagem" : "Criar meu personagem"}
          </Link>

          {state.characterClaimed && (
            <Link
              href={`/${slug}/jogo/mapa`}
              className={buttonVariants({ className: "h-12 justify-center text-base font-semibold" })}
            >
              Entrar na festa
            </Link>
          )}

          {supportsPasskey && !state.isVisitor && (
            <div className={card}>
              <span className={label}>Acesso rápido</span>
              <p className="text-sm text-[var(--theme-secondary)]">
                {state.hasPasskey
                  ? "Adicione este aparelho para entrar sem e-mail da próxima vez."
                  : "Crie um passkey para entrar com Face ID / digital, sem e-mail."}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={onRegisterPasskey}
                className={buttonVariants({ variant: "outline", className: "h-11 justify-center" })}
              >
                Criar passkey neste aparelho
              </button>
            </div>
          )}

          <p className="text-xs text-[var(--theme-secondary)] max-w-sm">
            <Construction className="inline size-4 -mt-0.5 mr-1" aria-hidden /> A recepção já está aberta; o salão e as demais fases
            chegam em seguida. Sua identidade e seu personagem ficam guardados.
          </p>
        </>
      )}
    </div>
  );
}
