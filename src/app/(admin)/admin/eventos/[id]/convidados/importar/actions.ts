"use server";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/authorization";
import { generateSessionToken } from "@/lib/auth/guest";
import { z } from "zod";

const RowSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().optional().default(""),
  grupo: z.string().optional().default(""),
  acompanhantes: z.coerce.number().int().min(0).max(10).default(0),
  restricao_alimentar: z.string().optional().default(""),
});

export type ParsedRow = z.infer<typeof RowSchema> & { _rowNum: number };
export type RowError = { _rowNum: number; raw: Record<string, string>; error: string };

export type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: RowError[];
};

export async function importGuests(
  eventId: string,
  rows: ParsedRow[],
  duplicateStrategy: "update" | "skip"
): Promise<ImportResult> {
  await requireOrganizer(eventId);

  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const existing = await prisma.guest.findFirst({
      where: { eventId, email: row.email.toLowerCase(), deletedAt: null },
    });

    if (existing) {
      if (duplicateStrategy === "skip") {
        result.skipped++;
        continue;
      }
      await prisma.guest.update({
        where: { id: existing.id },
        data: {
          name: row.nome,
          phone: row.telefone || null,
          plusOnes: row.acompanhantes,
          dietaryRestrictions: row.restricao_alimentar || null,
        },
      });
      result.updated++;
    } else {
      await prisma.guest.create({
        data: {
          eventId,
          name: row.nome,
          email: row.email.toLowerCase(),
          phone: row.telefone || null,
          plusOnes: row.acompanhantes,
          dietaryRestrictions: row.restricao_alimentar || null,
          rsvpStatus: "PENDING",
          sessionToken: generateSessionToken(),
        },
      });
      result.imported++;
    }
  }

  return result;
}

export async function parseRows(
  rawRows: Record<string, string>[]
): Promise<{ valid: ParsedRow[]; errors: RowError[] }> {
  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    // Normalize keys: lowercase + replace spaces with underscore
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[k.toLowerCase().trim().replace(/\s+/g, "_")] = String(v ?? "").trim();
    }
    const result = RowSchema.safeParse(normalized);
    if (result.success) {
      valid.push({ ...result.data, _rowNum: i + 2 });
    } else {
      errors.push({
        _rowNum: i + 2,
        raw,
        error: result.error.issues.map((e) => e.message).join("; "),
      });
    }
  }

  return { valid, errors };
}
