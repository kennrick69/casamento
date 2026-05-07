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
      <AccessibilityBar />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav slug={slug} />
    </div>
  );
}
