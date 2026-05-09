import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { getThemeCssVars } from "@/lib/themes/css";
import type { ThemeTokens } from "@/lib/themes";
import { CustomizerClient } from "./customizer-client";
import Link from "next/link";

export const metadata: Metadata = { title: "Personalizar convite" };

export default async function PersonalizarPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  try { await requireOrganizer(id); } catch { notFound(); }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { slug: true, coupleNames: true, paletteColors: true, customization: true, theme: { select: { tokens: true } } },
  });
  if (!event) notFound();

  const tokens = event.theme.tokens as unknown as ThemeTokens;
  const themeColors = getThemeCssVars(tokens);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="border-b bg-background px-6 py-3 flex items-center gap-3 shrink-0">
        <Link href={`/admin/eventos/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {event.coupleNames}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-semibold text-sm">Personalizar convite</h1>
      </header>

      <CustomizerClient
        eventId={id}
        slug={event.slug}
        initialPalette={(event.paletteColors as Record<string, string>) ?? {}}
        initialCustomization={(event.customization as Record<string, unknown>) ?? {}}
        themeColors={themeColors}
      />
    </div>
  );
}
