"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createQARun(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const title = (formData.get("title") as string | null)?.trim() || "Execução sem título";

  const run = await prisma.qATestRun.create({
    data: {
      title,
      createdById: session.user.id,
    },
  });

  redirect(`/admin/qa/${run.id}`);
}

export async function saveRunResults(
  runId: string,
  results: Record<string, { status: string; note: string }>,
  notes: string,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.qATestRun.updateMany({
    where: { id: runId, createdById: session.user.id },
    data: { results, notes },
  });

  revalidatePath(`/admin/qa/${runId}`);
}

export async function finalizeRun(runId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.qATestRun.updateMany({
    where: { id: runId, createdById: session.user.id },
    data: { finishedAt: new Date() },
  });

  revalidatePath(`/admin/qa/${runId}`);
  revalidatePath("/admin/qa");
}
