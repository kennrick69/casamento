"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";

const BasicSchema = z.object({
  coupleNames: z.string().min(3, "Nome do casal obrigatório"),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Somente letras minúsculas, números e hífens"),
  ceremonyDate: z.string().min(1, "Data obrigatória"),
  ceremonyTime: z.string().min(1, "Horário obrigatório"),
  timezone: z.string().default("America/Sao_Paulo"),
  rsvpEarlyDeadline: z.string().optional(),
});

export async function createEventBasic(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const parsed = BasicSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { coupleNames, slug, ceremonyDate, ceremonyTime, timezone, rsvpEarlyDeadline } =
    parsed.data;

  const slugInUse = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (slugInUse) return; // slug duplicado — sem feedback inline por ora (form recarrega sem ação)

  const defaultTheme = await prisma.theme.findFirstOrThrow({ where: { key: "minimal" } });

  const event = await prisma.event.create({
    data: {
      slug,
      title: `Casamento de ${coupleNames}`,
      coupleNames,
      ceremonyDate: new Date(`${ceremonyDate}T${ceremonyTime}:00`),
      timezone,
      rsvpEarlyDeadline: rsvpEarlyDeadline ? new Date(rsvpEarlyDeadline) : null,
      themeId: defaultTheme.id,
      publicTokenK: nanoid(16),
      status: "DRAFT",
      features: {
        rsvp: true,
        photoWall: true,
        chat: true,
        playlist: true,
        gamification: true,
        donations: false,
      },
      organizers: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  redirect(`/admin/eventos/${event.id}/configuracoes?step=2`);
}
