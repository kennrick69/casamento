import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getThemeCssVars, cssVarsToStyle } from "@/lib/themes/css";
import { BottomNav } from "@/components/guest/bottom-nav";
import { AccessibilityBar } from "@/components/guest/accessibility-bar";
import { LocaleToggle } from "@/components/guest/locale-toggle";
import type { ThemeTokens } from "@/lib/themes";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: { theme: true },
  });

  if (!event) notFound();

  const tokens = event.theme.tokens as unknown as ThemeTokens;
  const palette = event.paletteColors as Partial<ThemeTokens["colors"]> | null;
  const cssVars = {
    ...getThemeCssVars(tokens),
    ...(palette
      ? {
          ...(palette.primary && { "--theme-primary": palette.primary }),
          ...(palette.secondary && { "--theme-secondary": palette.secondary }),
          ...(palette.accent && { "--theme-accent": palette.accent }),
          ...(palette.background && { "--theme-background": palette.background }),
          ...(palette.foreground && { "--theme-foreground": palette.foreground }),
          ...(palette.muted && { "--theme-muted": palette.muted }),
          ...(palette.border && { "--theme-border": palette.border }),
        }
      : {}),
  };

  return (
    <div
      style={cssVarsToStyle(cssVars)}
      className="min-h-screen flex flex-col bg-[var(--theme-background)] text-[var(--theme-foreground)]"
    >
      {/* Skip-to-content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--theme-primary)] focus:text-[var(--theme-primary-foreground)] focus:text-sm focus:font-medium"
      >
        Ir para o conteúdo
      </a>
      <div className="flex justify-end px-4 pt-3">
        <LocaleToggle />
      </div>
      <AccessibilityBar />
      <main id="main-content" className="flex-1 pb-20" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>{children}</main>
      <BottomNav
        slug={slug}
        ceremonyDate={event.ceremonyDate.toISOString()}
        timezone={event.timezone}
      />
    </div>
  );
}
