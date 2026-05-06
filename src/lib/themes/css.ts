import type { ThemeTokens } from "./index";

// Mapeia o nome da fonte (como vem do theme.tokens) para a CSS variable do root layout
const FONT_VAR: Record<string, string> = {
  Inter: "var(--font-inter)",
  "Cormorant Garamond": "var(--font-cormorant)",
  Fraunces: "var(--font-fraunces)",
  Lora: "var(--font-lora)",
  Caveat: "var(--font-caveat)",
  "DM Serif Display": "var(--font-dm-serif)",
};

export function getThemeCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--theme-primary": tokens.colors.primary,
    "--theme-secondary": tokens.colors.secondary,
    "--theme-accent": tokens.colors.accent,
    "--theme-background": tokens.colors.background,
    "--theme-foreground": tokens.colors.foreground,
    "--theme-muted": tokens.colors.muted,
    "--theme-border": tokens.colors.border,
    "--theme-radius": tokens.radius,
    "--theme-font-heading": FONT_VAR[tokens.fonts.heading] ?? "var(--font-inter)",
    "--theme-font-body": FONT_VAR[tokens.fonts.body] ?? "var(--font-inter)",
  };
}

export function cssVarsToStyle(vars: Record<string, string>): React.CSSProperties {
  return vars as unknown as React.CSSProperties;
}
