"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isHttpUrl } from "@/lib/utils/safe-href";
import { isReservedSlug } from "@/lib/utils/slug-validation";

async function withOrganizer(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  await requireOrganizer(eventId);
}

// ── Dados básicos ─────────────────────────────────────────────────────────

const BasicSchema = z.object({
  eventId: z.string(),
  coupleNames: z.string().min(3),
  ceremonyDate: z.string(),
  ceremonyTime: z.string(),
  timezone: z.string(),
  rsvpEarlyDeadline: z.string().optional(),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Somente letras minúsculas, números e hífens")
    .refine((s) => !isReservedSlug(s), "Esta URL não está disponível")
    .optional(),
});

export async function updateEventBasic(formData: FormData): Promise<void> {
  const parsed = BasicSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, coupleNames, ceremonyDate, ceremonyTime, timezone, rsvpEarlyDeadline, slug } =
    parsed.data;

  try {
    await withOrganizer(eventId);
  } catch {
    return;
  }

  // Resolve novo slug se fornecido e diferente do atual
  let resolvedSlug: string | undefined;
  if (slug) {
    const conflict = await prisma.event.findFirst({
      where: { slug, NOT: { id: eventId } },
      select: { id: true },
    });
    if (!conflict) resolvedSlug = slug;
    // Se houver conflito, mantém o slug atual (sem feedback inline por ora)
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      coupleNames,
      title: `Casamento de ${coupleNames}`,
      ceremonyDate: new Date(`${ceremonyDate}T${ceremonyTime}:00`),
      timezone,
      rsvpEarlyDeadline: rsvpEarlyDeadline ? new Date(rsvpEarlyDeadline) : null,
      ...(resolvedSlug ? { slug: resolvedSlug } : {}),
    },
  });

  revalidatePath(`/admin/eventos/${eventId}/configuracoes`);
}

// ── Local ─────────────────────────────────────────────────────────────────

const LocationSchema = z.object({
  eventId: z.string(),
  ceremonyLocation: z.string().optional(),
  ceremonyAddress: z.string().optional(),
  receptionLocation: z.string().optional(),
  receptionAddress: z.string().optional(),
  mapsLink: z.string().url().refine((u) => isHttpUrl(u), "URL deve começar com https://").optional().or(z.literal("")),
  dresscode: z.string().optional(),
});

export async function updateEventLocation(formData: FormData): Promise<void> {
  const parsed = LocationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, mapsLink, ...data } = parsed.data;

  try {
    await withOrganizer(eventId);
  } catch {
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });

  await prisma.event.update({
    where: { id: eventId },
    data: { ...data, mapsLink: mapsLink || null },
  });

  if (event?.status === "DRAFT") {
    redirect(`/admin/eventos/${eventId}/configuracoes?step=3`);
  }
  revalidatePath(`/admin/eventos/${eventId}/configuracoes`);
}

// ── Tema ──────────────────────────────────────────────────────────────────

const ThemeSchema = z.object({ eventId: z.string(), themeKey: z.string() });

export async function updateEventTheme(formData: FormData): Promise<void> {
  const parsed = ThemeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, themeKey } = parsed.data;

  try {
    await withOrganizer(eventId);
  } catch {
    return;
  }

  const theme = await prisma.theme.findUnique({ where: { key: themeKey } });
  if (!theme) return;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });

  await prisma.event.update({ where: { id: eventId }, data: { themeId: theme.id } });

  if (event?.status === "DRAFT") {
    redirect(`/admin/eventos/${eventId}/configuracoes?step=4`);
  }
  revalidatePath(`/admin/eventos/${eventId}/configuracoes`);
}

// ── Funcionalidades ───────────────────────────────────────────────────────

const FEATURE_KEYS = [
  "rsvp",
  "photoWall",
  "chat",
  "playlist",
  "gamification",
  "donations",
] as const;

export async function updateEventFeatures(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId") as string;
  if (!eventId) return;

  try {
    await withOrganizer(eventId);
  } catch {
    return;
  }

  const features: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    features[key] = formData.get(`feature_${key}`) === "on";
  }

  await prisma.event.update({ where: { id: eventId }, data: { features } });
  revalidatePath(`/admin/eventos/${eventId}/configuracoes`);
}

// ── Variantes de rascunho (sem redirect — usadas pelo auto-save onBlur) ───

export async function saveEventLocationDraft(formData: FormData): Promise<{ ok: boolean }> {
  const parsed = LocationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false };

  const { eventId, mapsLink, ...data } = parsed.data;
  try {
    await withOrganizer(eventId);
  } catch {
    return { ok: false };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { ...data, mapsLink: mapsLink || null },
  });
  revalidatePath(`/admin/eventos/${eventId}/configuracoes`);
  return { ok: true };
}

export async function saveEventThemeDraft(formData: FormData): Promise<{ ok: boolean }> {
  const parsed = ThemeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false };

  const { eventId, themeKey } = parsed.data;
  try {
    await withOrganizer(eventId);
  } catch {
    return { ok: false };
  }

  const theme = await prisma.theme.findUnique({ where: { key: themeKey } });
  if (!theme) return { ok: false };

  await prisma.event.update({ where: { id: eventId }, data: { themeId: theme.id } });
  revalidatePath(`/admin/eventos/${eventId}/configuracoes`);
  return { ok: true };
}

const PublishSettingsSchema = z.object({
  eventId: z.string(),
  guestApprovalRequired: z.string().optional(),
  donationMode: z.enum(["TRUST", "PIX_PROOF"]).default("TRUST"),
  pixKey: z.string().optional(),
});

export async function savePublishSettings(formData: FormData): Promise<{ ok: boolean }> {
  const parsed = PublishSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false };

  const { eventId, guestApprovalRequired, donationMode, pixKey } = parsed.data;
  try {
    await withOrganizer(eventId);
  } catch {
    return { ok: false };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      guestApprovalRequired: guestApprovalRequired === "on",
      donationMode,
      pixKey: pixKey || null,
    },
  });
  revalidatePath(`/admin/eventos/${eventId}/configuracoes`);
  return { ok: true };
}

// ── Publicar ──────────────────────────────────────────────────────────────

const PublishSchema = z.object({
  eventId: z.string(),
  guestApprovalRequired: z.string().optional(),
  donationMode: z.enum(["TRUST", "PIX_PROOF"]).default("TRUST"),
  pixKey: z.string().optional(),
});

export async function publishEvent(formData: FormData): Promise<void> {
  const parsed = PublishSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { eventId, guestApprovalRequired, donationMode, pixKey } = parsed.data;

  try {
    await withOrganizer(eventId);
  } catch {
    return;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "PUBLISHED",
      guestApprovalRequired: guestApprovalRequired === "on",
      donationMode,
      pixKey: pixKey || null,
    },
  });

  redirect(`/admin/eventos/${eventId}`);
}
