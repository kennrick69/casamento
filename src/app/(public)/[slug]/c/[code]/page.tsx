import { redirect } from "next/navigation";
import { getGameEvent, firstName } from "@/lib/game/identity";
import { lookupCode } from "@/lib/invite/codes";
import { RedeemClient, type RedeemState } from "./redeem-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Convite",
  robots: { index: false, follow: false }, // o resgate não é indexável
};

// Resgate de código de convite (S4a): /<slug>/c/<CODE>.
// PERSONAL → entra como o convidado. BLANK livre → cria o convidado + família.
// BLANK já usado → "já usado por <Nome>, é você?" + passkey. Inválido → aviso.
export default async function RedeemPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;

  const event = await getGameEvent(slug);
  if (!event) redirect(`/${slug}`); // evento clássico / inexistente → landing

  const invite = await lookupCode(event.id, code);

  let state: RedeemState;
  if (!invite || invite.invalidatedAt) {
    state = { kind: "invalid" };
  } else if (invite.kind === "PERSONAL") {
    const g = invite.guest;
    state = !g || g.banned || g.deletedAt
      ? { kind: "invalid" }
      : { kind: "personal", firstName: firstName(g.playerName ?? g.name) };
  } else if (invite.claimedAt || invite.guestId) {
    const g = invite.guest;
    state = { kind: "blank_claimed", claimantName: g ? firstName(g.playerName ?? g.name) : "alguém" };
  } else {
    state = { kind: "blank_free", maxCompanions: invite.maxCompanions };
  }

  return <RedeemClient slug={slug} code={code} coupleNames={event.coupleNames} state={state} />;
}
