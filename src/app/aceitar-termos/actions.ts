"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions";
import { redirect } from "next/navigation";

export async function acceptTerms(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
    },
  });

  redirect("/admin");
}
