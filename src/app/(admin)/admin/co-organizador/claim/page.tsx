import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyClaimToken } from "@/lib/auth/co-org-token";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aceitar convite" };

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  if (!t) redirect("/admin");

  const payload = verifyClaimToken(t);
  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">⏰</p>
          <h1 className="font-semibold text-lg mb-2">Link expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de convite expirou ou é inválido. Peça ao organizador para reenviar.
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    // Redireciona para login, preservando o token no callbackUrl
    const callbackUrl = `/admin/co-organizador/claim?t=${t}`;
    await signIn("resend", { email: payload.inviteeEmail, redirectTo: callbackUrl });
    redirect("/login");
  }

  // Cria ou atualiza o vínculo de co-organizador
  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
    select: { id: true, coupleNames: true },
  });

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Evento não encontrado.</p>
      </div>
    );
  }

  const existing = await prisma.eventOrganizer.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
  });

  if (!existing) {
    await prisma.eventOrganizer.create({
      data: { eventId: event.id, userId: session.user.id, role: "EDITOR" },
    });
  }

  redirect(`/admin/eventos/${event.id}`);
}
