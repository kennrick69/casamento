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
  const [isPending, startTransition] = useTransition();

  function handleBan() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("guestId", guestId);
      fd.set("eventId", eventId);
      await toggleGuestBan(fd);
    });
  }

  function handleRemove() {
    if (!confirm("Remover este convidado? A ação pode ser desfeita recriando a confirmação de presença.")) return;
    startTransition(async () => {
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
        disabled={isPending}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {banned ? "Desbanir" : "Banir"}
      </button>
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="text-xs text-red-500 hover:text-red-700 transition-colors"
      >
        Remover
      </button>
    </div>
  );
}
