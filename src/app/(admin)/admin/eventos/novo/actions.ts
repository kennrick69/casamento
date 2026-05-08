"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { seedDefaultMissions } from "@/lib/points";

const BasicSchema = z.object({
  coupleNames: z.string().min(3, "Nome do casal obrigatório"),
  ceremonyDate: z.string().min(1, "Data obrigatória"),
  ceremonyTime: z.string().min(1, "Horário obrigatório"),
  timezone: z.string().default("America/Sao_Paulo"),
  rsvpEarlyDeadline: z.string().optional(),
});

function generateSlugFromNames(coupleNames: string): string {
  return (
    coupleNames
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // remove acentos (ã→a, é→e …)
      .replace(/[^a-z0-9\s-]/g, "")   // remove caracteres especiais
      .trim()
      .replace(/\s+/g, "-")           // espaços → hífens
      .replace(/-+/g, "-")            // hífens duplicados → um
      .replace(/^-|-$/g, "")          // apara extremidades
      .slice(0, 60) || "casamento"    // fallback se ficar vazio
  );
}

async function generateUniqueSlug(coupleNames: string): Promise<string> {
  const base = generateSlugFromNames(coupleNames);

  const existing = await prisma.event.findUnique({
    where: { slug: base },
    select: { id: true },
  });
  if (!existing) return base;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base.slice(0, 57)}-${i}`;
    const taken = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  // Caso ultra-raro: fallback com nanoid
  return `${base.slice(0, 50)}-${nanoid(6)}`;
}

export async function createEventBasic(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const parsed = BasicSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const { coupleNames, ceremonyDate, ceremonyTime, timezone, rsvpEarlyDeadline } = parsed.data;

  const slug = await generateUniqueSlug(coupleNames);
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

  await seedDefaultMissions(event.id);

  redirect(`/admin/eventos/${event.id}/configuracoes?step=2`);
}
