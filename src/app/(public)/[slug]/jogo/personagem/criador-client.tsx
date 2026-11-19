"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Lock, Check, Loader2 } from "lucide-react";
import {
  SKINS,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_COLORS,
  EYEBROWS,
  BEARDS,
  GLASSES,
  OUTFITS,
  type CharacterSpec,
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

  function set<K extends keyof CharacterSpec>(key: K, value: CharacterSpec[K]) {
    setSpec((s) => ({ ...s, [key]: value }));
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
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center px-4 py-8 gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Crie seu personagem</h1>
        <p className="text-sm text-neutral-400">Olá, {playerName}! Monte seu boneco para a festa.</p>
      </header>

      <div className="grid gap-6 w-full max-w-3xl md:grid-cols-[220px_1fr]">
        {/* Preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl p-4 bg-gradient-to-b from-sky-200 to-sky-400 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={previewUrl}
              src={previewUrl}
              alt="Prévia do personagem"
              width={192}
              height={192}
              style={{ imageRendering: "pixelated", width: 192, height: 192 }}
            />
          </div>
          <button
            onClick={onSave}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-60 w-full"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {saved ? "Salvo!" : "Salvar personagem"}
          </button>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          {saved && (
            <Link
              href={`/${slug}/jogo`}
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold w-full"
            >
              Voltar ao jogo
            </Link>
          )}
        </div>

        {/* Pickers */}
        <div className="flex flex-col gap-5">
          <Group label="Corpo">
            {BODIES.map((o) => (
              <Pick key={o.id} active={spec.body === o.id} onClick={() => set("body", o.id as CharacterSpec["body"])}>
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
            {HAIR_STYLES.map((o) => (
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
            {OUTFITS.map((o) => {
              const locked = (o.bride || o.groom) && !canRestricted;
              return (
                <Pick
                  key={o.id}
                  active={spec.outfit === o.id}
                  disabled={locked}
                  title={locked ? "Traje reservado aos organizadores do evento." : undefined}
                  onClick={() => !locked && set("outfit", o.id)}
                >
                  {locked && <Lock className="size-3" />}
                  {o.label}
                </Pick>
              );
            })}
          </Group>
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
