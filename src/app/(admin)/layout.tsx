import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal/versions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsVersion: true, privacyVersion: true },
  });

  if (user?.termsVersion !== TERMS_VERSION || user?.privacyVersion !== PRIVACY_VERSION) {
    redirect("/aceitar-termos");
  }

  return <>{children}</>;
}
