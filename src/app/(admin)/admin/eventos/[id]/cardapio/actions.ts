"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

function parseLines(raw: string | null): string[] {
  return (raw ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 50);
}

export async function saveCardapio(formData: FormData): Promise<{ ok: boolean }> {
  const eventId = formData.get("eventId") as string;
  try { await requireOrganizer(eventId); } catch { return { ok: false }; }

  const foods = parseLines(formData.get("foods") as string | null);
  const drinks = parseLines(formData.get("drinks") as string | null);
  const byoNotice = ((formData.get("byoNotice") as string | null) ?? "").trim().slice(0, 300);
  const tableFoundMessage = ((formData.get("tableFoundMessage") as string | null) ?? "").trim().slice(0, 500);

  // Sem comidas nem bebidas → limpa o menu (jogo volta ao cardápio de EXEMPLO).
  // Json? no Prisma exige Prisma.DbNull para gravar NULL no banco.
  const hasMenu = foods.length > 0 || drinks.length > 0;
  const menu: Prisma.InputJsonValue | typeof Prisma.DbNull = hasMenu
    ? { foods, drinks, byoNotice }
    : Prisma.DbNull;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      menu,
      tableFoundMessage: tableFoundMessage || null,
    },
  });

  revalidatePath(`/admin/eventos/${eventId}/cardapio`);
  revalidatePath(`/admin/eventos/${eventId}`);
  return { ok: true };
}
