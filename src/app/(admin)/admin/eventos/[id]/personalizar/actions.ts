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

  await prisma.event.update({
    where: { id: eventId },
    data: {
      paletteColors: palette as Prisma.InputJsonValue,
      customization: customization as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/admin/eventos/${eventId}/personalizar`);
  return { ok: true };
}

export async function resetCustomization(eventId: string): Promise<{ ok: boolean }> {
  try {
    await requireOrganizer(eventId);
  } catch {
    return { ok: false };
  }
  await prisma.event.update({
    where: { id: eventId },
    data: { paletteColors: Prisma.DbNull, customization: Prisma.DbNull },
  });
  revalidatePath(`/admin/eventos/${eventId}/personalizar`);
  return { ok: true };
}
