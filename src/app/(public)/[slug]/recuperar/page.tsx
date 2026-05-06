import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyRecoveryToken, setGuestCookie } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { RecoverForm } from "@/components/guest/recover-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recuperar acesso" };

export default async function RecoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;

  // Se veio com token no link — valida e redireciona
  if (t) {
    const sessionToken = verifyRecoveryToken(t);
    if (sessionToken) {
      const guest = await prisma.guest.findFirst({
        where: { sessionToken, event: { slug }, banned: false, deletedAt: null },
      });
      if (guest) {
        await setGuestCookie(sessionToken);
        redirect(`/${slug}`);
      }
    }

    // Token inválido ou expirado
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-4xl">⏱</p>
        <h1 className="text-xl font-semibold">Link expirado</h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          Este link de acesso não é mais válido. Solicite um novo abaixo.
        </p>
        <Link href={`/${slug}/recuperar`} className="underline underline-offset-2 text-sm">
          Pedir novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-sm mx-auto flex flex-col gap-6">
      <div>
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          Recuperar acesso
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">
          Digite seu e-mail e enviaremos um link de acesso.
        </p>
      </div>
      <RecoverForm slug={slug} />
    </div>
  );
}
