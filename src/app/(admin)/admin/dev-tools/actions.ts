"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
}

export async function deleteVerificationToken(formData: FormData): Promise<void> {
  await requireAuth();
  const token = formData.get("token") as string;
  if (!token) return;
  await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
  revalidatePath("/admin/dev-tools");
}

export async function invalidatePasswordReset(formData: FormData): Promise<void> {
  await requireAuth();
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.passwordReset.update({
    where: { id },
    data: { usedAt: new Date() },
  }).catch(() => {});
  revalidatePath("/admin/dev-tools");
}
