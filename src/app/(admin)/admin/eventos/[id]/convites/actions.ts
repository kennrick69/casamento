"use server";

import { z } from "zod";
import { requireOrganizer } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { createBlankBatch, setInviteInvalidated } from "@/lib/invite/codes";

type Result = { ok: true; count?: number } | { ok: false; message: string };

const BatchSchema = z.object({
  eventId: z.string().min(1),
  count: z.coerce.number().int().min(1).max(500),
  maxCompanions: z.coerce.number().int().min(0).max(10),
  label: z.string().trim().max(60).optional(),
});

export async function generateBlankBatch(formData: FormData): Promise<Result> {
  const parsed = BatchSchema.safeParse({
    eventId: formData.get("eventId"),
    count: formData.get("count"),
    maxCompanions: formData.get("maxCompanions"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  await requireOrganizer(parsed.data.eventId);
  const codes = await createBlankBatch(
    parsed.data.eventId,
    parsed.data.count,
    parsed.data.maxCompanions,
    parsed.data.label
  );
  revalidatePath(`/admin/eventos/${parsed.data.eventId}/convites`);
  return { ok: true, count: codes.length };
}

export async function invalidateCode(eventId: string, codeId: string, invalid: boolean): Promise<Result> {
  await requireOrganizer(eventId);
  await setInviteInvalidated(codeId, invalid);
  revalidatePath(`/admin/eventos/${eventId}/convites`);
  return { ok: true };
}
