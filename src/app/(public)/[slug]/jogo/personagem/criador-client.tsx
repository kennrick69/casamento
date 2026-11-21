"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Play } from "lucide-react";
import {
  SKINS,
  HAIR_COLORS,
  EYE_COLORS,
  EYEBROWS,
  BEARDS,
  GLASSES,
  outfitsFor,
  hairsFor,
  defaultOutfit,
  defaultHair,
  type CharacterSpec,
  type BodyType,
} from "@/lib/game/character/catalog";
import { saveCharacter } from "./actions";

const BODIES = [
  { id: "feminino", label: "Feminino" },
  { id: "masculino", label: "Masculino" },
];

export function CriadorClient({
  slug,
  playerName,
  canRestricted,
  initial,
}: {
  slug: string;
  playerName: string;
  canRestricted: boolean;
  initial: CharacterSpec;
}) {
  const [spec, setSpec] = useState<CharacterSpec>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewUrl = useMemo(() => {
    const q = new URLSearchParams(spec as unknown as Record<string, string>);
    return `/${slug}/jogo/personagem/preview?${q.toString()}`;
  }, [slug, spec]);

  // Listas visíveis conforme o corpo (item 1) e o papel (item 4: visitante não
  // vê noivo/noiva).
  const visibleOutfits = useMemo(() => outfitsFor(spec.body, canRestricted), [spec.body, canRestricted]);
  const visibleHairs = useMemo(() => hairsFor(spec.body), [spec.body]);

  function set<K extends keyof CharacterSpec>(key: K, value: CharacterSpec[K]) {
    setSpec((s) => ({ ...s, [key]: value }));
    setSaved(false);
    setError(null);
  }

  // Trocar o corpo auto-ajusta roupa e cabelo que não combinam (item 1).
  function setBody(body: BodyType) {
    setSpec((s) => {
      const next = { ...s, body };
      if (!outfitsFor(body, canRestricted).some((o) => o.id === s.outfit)) next.outfit = defaultOutfit(body, canRestricted);
      if (!hairsFor(body).some((h) => h.id === s.hairStyle)) next.hairStyle = defaultHair(body);
      return next;
    });
    setSaved(false);
    setError(null);
  }

  function onSave() {
    startTransition(async () => {
      const r = await saveCharacter(slug, spec);
      if (r.ok) setSaved(true);
      else setError(r.error);
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-neutral-900 text-neutral-100">
      {/* Prévia FIXA no topo (sticky) — fica visível enquanto rola as opções (item 21) */}
      <div className="sticky top-0 z-20 flex flex-col items-center gap-2 border-b border-neutral-800 bg-neutral-900/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="text-center">
          <h1 className="text-lg font-bold leading-tight">Crie seu personagem</h1>
          <p className="text-xs text-neutral-400">Olá, {playerName}! Monte seu boneco e salve no fim.</p>
        </div>
        <div className="relative flex size-[132px] items-center justify-center rounded-xl bg-gradient-to-b from-sky-200 to-sky-400 p-2 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={previewUrl}
            src={previewUrl}
            alt="Prévia do personagem"
            width={116}
            height={116}
            onError={(e) => {
              // prévia nunca derruba a página: se falhar, mostra o alt (item 9)
              e.currentTarget.style.visibility = "hidden";
            }}
            onLoad={(e) => {
              e.currentTarget.style.visibility = "visible";
            }}
            style={{ imageRendering: "pixelated", width: 116, height: 116 }}
          />
        </div>
      </div>

      {/* Opções (rolam sob a prévia); pb extra p/ não ficar atrás da barra fixa */}
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-36">
        <div className="flex flex-col gap-5">
          <Group label="Corpo">
            {BODIES.map((o) => (
              <Pick key={o.id} active={spec.body === o.id} onClick={() => setBody(o.id as BodyType)}>
                {o.label}
              </Pick>
            ))}
          </Group>
          <Group label="Pele">
            {SKINS.map((o) => (
              <Pick key={o.id} active={spec.skin === o.id} swatch={o.hex} onClick={() => set("skin", o.id)}>
                {o.label}
              </Pick>
            ))}
          </Group>
          <Group label="Olhos">
            {EYE_COLORS.map((o) => (
              <Pick key={o.id} active={spec.eyeColor === o.id} swatch={o.hex} onClick={() => set("eyeColor", o.id)}>
                {o.label}
              </Pick>
            ))}
          </Group>
          <Group label="Sobrancelha">
            {EYEBROWS.map((o) => (
              <Pick key={o.id} active={spec.eyebrows === o.id} onClick={() => set("eyebrows", o.id)}>
                {o.label}
              </Pick>
            ))}
          </Group>
          <Group label="Cabelo">
            {visibleHairs.map((o) => (
              <Pick key={o.id} active={spec.hairStyle === o.id} onClick={() => set("hairStyle", o.id)}>
                {o.label}
              </Pick>
            ))}
          </Group>
          {spec.hairStyle !== "none" && (
            <Group label="Cor do cabelo">
              {HAIR_COLORS.map((o) => (
                <Pick key={o.id} active={spec.hairColor === o.id} swatch={o.hex} onClick={() => set("hairColor", o.id)}>
                  {o.label}
                </Pick>
              ))}
            </Group>
          )}
          <Group label="Barba">
            {BEARDS.map((o) => (
              <Pick key={o.id} active={spec.beard === o.id} onClick={() => set("beard", o.id)}>
                {o.label}
              </Pick>
            ))}
          </Group>
          <Group label="Óculos">
            {GLASSES.map((o) => (
              <Pick key={o.id} active={spec.glasses === o.id} onClick={() => set("glasses", o.id)}>
                {o.label}
              </Pick>
            ))}
          </Group>
          <Group label="Roupa">
            {visibleOutfits.map((o) => (
              <Pick key={o.id} active={spec.outfit === o.id} onClick={() => set("outfit", o.id)}>
                {o.label}
              </Pick>
            ))}
          </Group>
        </div>
      </div>

      {/* Barra FIXA embaixo: Salvar / Entrar no jogo — o botão fica POR ÚLTIMO,
          depois de todas as escolhas (item 21). */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-900/97 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {error && (
            <p className="rounded-lg bg-red-950/60 px-3 py-2 text-center text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          {saved ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/${slug}/jogo/mapa`}
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-lg ring-1 ring-emerald-300 hover:bg-emerald-500"
              >
                <Play className="size-5" aria-hidden /> Entrar no jogo
              </Link>
              <button
                onClick={() => setSaved(false)}
                className="h-14 rounded-xl border border-neutral-600 px-4 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                Editar
              </button>
            </div>
          ) : (
            <button
              onClick={onSave}
              disabled={pending}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-400 bg-emerald-600 text-lg font-bold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
              Salvar personagem
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pick({
  active,
  disabled,
  title,
  swatch,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  swatch?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm border transition-colors ${
        active
          ? "bg-emerald-600 border-emerald-400 text-white"
          : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {swatch && (
        <span
          className="inline-block size-3.5 rounded-full border border-black/30"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
