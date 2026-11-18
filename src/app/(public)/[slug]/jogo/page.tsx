import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth/guest";
import { getGameEvent } from "@/lib/game/identity";
import { JogoIdentityClient, type IdentityState } from "./jogo-identity-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modo jogo",
  robots: { index: false, follow: false }, // o jogo não é indexável
};

// Rota de identidade do Modo Gamificado. Só existe para eventos GAMIFIED:
// um evento clássico cai de volta na landing normal (/[slug]). Zero impacto
// na experiência clássica.
export default async function JogoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await getGameEvent(slug);
  if (!event) redirect(`/${slug}`);

  const guest = await getCurrentGuest(slug);

  let state: IdentityState = {
    identified: false,
    playerName: null,
    isVisitor: false,
    hasPasskey: false,
    characterClaimed: false,
  };

  if (guest) {
    const passkeyCount = await prisma.guestCredential.count({
      where: { guestId: guest.id },
    });
    state = {
      identified: true,
      playerName: guest.playerName,
      isVisitor: guest.isVisitor,
      hasPasskey: passkeyCount > 0,
      characterClaimed: guest.characterClaimedAt !== null,
    };
  }

  return (
    <JogoIdentityClient
      slug={slug}
      coupleNames={event.coupleNames}
      recoverHref={`/${slug}/recuperar`}
      state={state}
    />
  );
}
