"use client";

import { useTransition } from "react";
import { toggleGuestBan, removeGuest } from "./actions";

export function GuestActions({
  guestId,
  eventId,
  banned,
}: {
  guestId: string;
  eventId: string;
  banned: boolean;
}) {
  const [isBanPending, startBanTransition] = useTransition();
  const [isRemovePending, startRemoveTransition] = useTransition();

  function handleBan() {
    startBanTransition(async () => {
      const fd = new FormData();
      fd.set("guestId", guestId);
      fd.set("eventId", eventId);
      await toggleGuestBan(fd);
    });
  }

  function handleRemove() {
    if (!confirm("Remover este convidado? A ação pode ser desfeita recriando a confirmação de presença.")) return;
    startRemoveTransition(async () => {
      const fd = new FormData();
      fd.set("guestId", guestId);
      fd.set("eventId", eventId);
      await removeGuest(fd);
    });
  }

  return (
    <div className="flex gap-2 shrink-0 ml-3">
      <button
        onClick={handleBan}
        disabled={isBanPending || isRemovePending}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isBanPending ? (banned ? "Desbanindo…" : "Banindo…") : (banned ? "Desbanir" : "Banir")}
      </button>
      <button
        onClick={handleRemove}
        disabled={isBanPending || isRemovePending}
        className="text-xs text-red-500 hover:text-red-700 transition-colors"
      >
        {isRemovePending ? "Removendo…" : "Remover"}
      </button>
    </div>
  );
}
