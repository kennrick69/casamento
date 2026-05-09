"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { saveCustomization, resetCustomization } from "./actions";
import type { PaletteColors, EventCustomization } from "./actions";

const TYPOGRAPHY_OPTIONS = [
  { value: "classic" as const, label: "Clássica", desc: "Cormorant Garamond — elegante e atemporal" },
  { value: "modern" as const, label: "Moderna", desc: "Inter — limpa e contemporânea" },
  { value: "romantic" as const, label: "Romântica", desc: "Lora — suave e expressiva" },
];

interface Props {
  eventId: string;
  slug: string;
  initialPalette: PaletteColors;
  initialCustomization: EventCustomization;
  themeColors: Record<string, string>;
}

export function CustomizerClient({ eventId, slug, initialPalette, initialCustomization, themeColors }: Props) {
  const [palette, setPalette] = useState<PaletteColors>(initialPalette);
  const [customization, setCustomization] = useState<EventCustomization>(initialCustomization);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

  const handleColorChange = useCallback((key: keyof PaletteColors, value: string) => {
    setPalette((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }, []);

  const handleCustomizationChange = useCallback(<K extends keyof EventCustomization>(key: K, value: EventCustomization[K]) => {
    setCustomization((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }, []);

  function handlePublish() {
    startTransition(async () => {
      await saveCustomization(eventId, palette, customization);
      setSaved(true);
      iframeRef.current?.contentWindow?.location.reload();
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetCustomization(eventId);
      setPalette({});
      setCustomization({});
      setSaved(false);
      iframeRef.current?.contentWindow?.location.reload();
    });
  }

  const COLOR_FIELDS: { key: keyof PaletteColors; label: string; themeKey: string }[] = [
    { key: "primary", label: "Cor primária", themeKey: "--theme-primary" },
    { key: "secondary", label: "Cor secundária", themeKey: "--theme-secondary" },
    { key: "accent", label: "Destaque", themeKey: "--theme-accent" },
    { key: "background", label: "Fundo", themeKey: "--theme-background" },
    { key: "foreground", label: "Texto principal", themeKey: "--theme-foreground" },
    { key: "border", label: "Bordas", themeKey: "--theme-border" },
  ];

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r bg-background overflow-y-auto flex flex-col">
        <div className="px-4 py-4 border-b">
          <h2 className="text-sm font-semibold">Personalizar convite</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Mudanças só são aplicadas ao clicar em "Publicar"</p>
        </div>

        {/* Colors */}
        <div className="px-4 py-4 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cores</h3>
          <div className="flex flex-col gap-3">
            {COLOR_FIELDS.map(({ key, label, themeKey }) => {
              const currentValue = palette[key] ?? themeColors[themeKey] ?? "#000000";
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="text-xs font-medium">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentValue}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="h-8 w-12 rounded border border-border cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-muted-foreground w-16">{currentValue}</span>
                    {palette[key] && (
                      <button
                        onClick={() => {
                          const next = { ...palette };
                          delete next[key];
                          setPalette(next);
                          setSaved(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        title="Resetar esta cor"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Typography */}
        <div className="px-4 py-4 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tipografia</h3>
          <div className="flex flex-col gap-2">
            {TYPOGRAPHY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  (customization.typography ?? "classic") === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="typography"
                  value={opt.value}
                  checked={(customization.typography ?? "classic") === opt.value}
                  onChange={() => handleCustomizationChange("typography", opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="px-4 py-4 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Seções visíveis</h3>
          <div className="flex flex-col gap-2">
            {(
              [
                { key: "showStory", label: "História do casal" },
                { key: "showWeddingParty", label: "Padrinhos e madrinhas" },
                { key: "showGuestbook", label: "Recados" },
              ] as { key: keyof EventCustomization; label: string }[]
            ).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customization[key] !== false}
                  onChange={(e) => handleCustomizationChange(key, e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Hero layout */}
        <div className="px-4 py-4 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Layout do cabeçalho</h3>
          <div className="flex gap-2">
            {(["centered", "split"] as const).map((layout) => (
              <button
                key={layout}
                onClick={() => handleCustomizationChange("heroLayout", layout)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  (customization.heroLayout ?? "centered") === layout
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {layout === "centered" ? "Centralizado" : "Dividido"}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 mt-auto flex flex-col gap-2">
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Salvando…" : saved ? "✓ Publicado" : "Publicar mudanças"}
          </button>
          <button
            onClick={handleReset}
            disabled={isPending}
            className="w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Restaurar padrão do tema
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 bg-muted/30 p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Preview ao vivo — <a href={`/${slug}`} target="_blank" className="underline">abrir em nova aba ↗</a>
          </p>
          <span className="text-xs text-muted-foreground">Publique para ver as mudanças aqui</span>
        </div>
        <iframe
          ref={iframeRef}
          src={`${APP_URL}/${slug}`}
          className="flex-1 rounded-lg border border-border bg-white w-full"
          title="Preview do convite"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
