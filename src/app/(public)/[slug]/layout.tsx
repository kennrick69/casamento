import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getThemeCssVars, cssVarsToStyle } from "@/lib/themes/css";
import { BottomNav } from "@/components/guest/bottom-nav";
import { AccessibilityBar } from "@/components/guest/accessibility-bar";
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
  const cssVars = getThemeCssVars(tokens);

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
