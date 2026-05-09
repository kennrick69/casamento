"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export interface PaletteColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  border?: string;
}

export interface EventCustomization {
  typography?: "classic" | "modern" | "romantic";
  heroLayout?: "centered" | "split";
  showGuestbook?: boolean;
  showWeddingParty?: boolean;
  showStory?: boolean;
}

export async function saveCustomization(
  eventId: string,
  palette: PaletteColors,
  customization: EventCustomization
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireOrganizer(eventId);
  } catch {
    return { ok: false, error: "Não autorizado." };
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      paletteColors: palette as Prisma.InputJsonValue,
      customization: customization as Prisma.InputJsonValue,
    },
    select: { slug: true },
  });

  revalidatePath(`/admin/eventos/${eventId}/personalizar`);
  // CSS vars vêm do layout da landing pública; revalidar como "layout" pra
  // que todas as rotas filhas (/[slug], /[slug]/historia, etc.) re-renderizem
  // com a nova paleta sem precisar deploy ou refresh manual.
  revalidatePath(`/${updated.slug}`, "layout");
  return { ok: true };
}

export async function resetCustomization(eventId: string): Promise<{ ok: boolean }> {
  try {
    await requireOrganizer(eventId);
  } catch {
    return { ok: false };
  }
  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { paletteColors: Prisma.DbNull, customization: Prisma.DbNull },
    select: { slug: true },
  });
  revalidatePath(`/admin/eventos/${eventId}/personalizar`);
  revalidatePath(`/${updated.slug}`, "layout");
  return { ok: true };
}
