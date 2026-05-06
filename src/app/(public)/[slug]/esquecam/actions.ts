"use server";

import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { clearGuestCookie } from "@/lib/auth/guest";
import { z } from "zod";

const schema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
});

type ForgetMeResult =
  | { ok: true }
  | { ok: false; message: string };

export async function forgetMe(formData: FormData): Promise<ForgetMeResult> {
  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const { slug, email } = parsed.data;

  const guest = await getCurrentGuest(slug);

  // Anti-enumeration: same response regardless
  if (!guest || guest.email !== email) {
    return { ok: true };
  }

  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      name: "Dados removidos",
      email: `removed_${guest.id}@deleted.invalid`,
      phone: null,
      deletedAt: new Date(),
    },
  });

  await clearGuestCookie();

  return { ok: true };
}
