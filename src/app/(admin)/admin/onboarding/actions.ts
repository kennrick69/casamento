"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

// Marca o onboarding como concluído e leva pra próxima rota.
// O destino vem do form pra que o último passo possa direcionar tanto
// pra criação de evento ("/admin/eventos/novo") quanto pro painel ("/admin").
export async function completeOnboarding(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingCompleted: true },
  });

  const target = String(formData.get("redirectTo") ?? "/admin");
  // Restringe a paths internos pra não virar open redirect.
  const safeTarget = target.startsWith("/") && !target.startsWith("//") ? target : "/admin";
  redirect(safeTarget);
}
