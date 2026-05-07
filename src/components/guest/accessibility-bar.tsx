"use client";

import { useEffect, useState } from "react";

type FontSize = "normal" | "large" | "xlarge";
const FONT_SIZES: FontSize[] = ["normal", "large", "xlarge"];

// Lê localStorage só no client; retorna default no server (SSR-safe).
function storedFont(): FontSize {
  if (typeof window === "undefined") return "normal";
  return (localStorage.getItem("a11y-font") as FontSize) ?? "normal";
}
function storedContrast(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("a11y-contrast") === "high";
}

export function AccessibilityBar() {
  // Lazy initializers leem localStorage no client na primeira hidratação.
  // suppressHydrationWarning no wrapper evita warning quando o valor difere do SSR.
  const [fontSize, setFontSize] = useState<FontSize>(storedFont);
  const [highContrast, setHighContrast] = useState<boolean>(storedContrast);

  // Aplica no DOM e persiste sempre que o estado muda (não é inicialização).
  useEffect(() => {
    const html = document.documentElement;
    if (fontSize === "normal") html.removeAttribute("data-font-size");
    else html.setAttribute("data-font-size", fontSize);
    localStorage.setItem("a11y-font", fontSize);
  }, [fontSize]);

  useEffect(() => {
    const html = document.documentElement;
    if (highContrast) html.setAttribute("data-contrast", "high");
    else html.removeAttribute("data-contrast");
    localStorage.setItem("a11y-contrast", highContrast ? "high" : "normal");
  }, [highContrast]);

  function toggleFont() {
    setFontSize((cur) => FONT_SIZES[(FONT_SIZES.indexOf(cur) + 1) % FONT_SIZES.length]);
  }

  const fontLabel = fontSize === "normal" ? "A" : fontSize === "large" ? "A+" : "A++";

  return (
    // suppressHydrationWarning: os botões mostram o estado do localStorage,
    // que só é conhecido no client — aceite de hidratação assimétrica intencional.
    <div
      suppressHydrationWarning
      role="toolbar"
      aria-label="Acessibilidade"
      className="flex items-center justify-end gap-1 px-3 py-1 text-xs border-b border-[var(--theme-border)] bg-[var(--theme-muted)]"
    >
      <button
        onClick={toggleFont}
        aria-label={`Tamanho de fonte: ${fontLabel}. Clique para aumentar.`}
        className="px-2 py-0.5 rounded hover:bg-[var(--theme-border)] transition-colors font-mono select-none"
        title="Ajustar tamanho da fonte"
      >
        {fontLabel}
      </button>
      <button
        onClick={() => setHighContrast((v) => !v)}
        aria-pressed={highContrast}
        aria-label={highContrast ? "Desativar alto contraste" : "Ativar alto contraste"}
        className={`px-2 py-0.5 rounded transition-colors select-none ${
          highContrast
            ? "bg-[var(--theme-foreground)] text-[var(--theme-background)]"
            : "hover:bg-[var(--theme-border)]"
        }`}
        title="Alternar alto contraste"
      >
        ◑
      </button>
    </div>
  );
}
