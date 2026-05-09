"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleGuestBan } from "../convidados/actions";

interface Guest {
  id: string;
  name: string;
  email: string;
  updatedAt: Date;
}

export function BannedGuestActions({ guest, eventId }: { guest: Guest; eventId: string }) {
  const [isPending, startTransition] = useTransition();

  function unban() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("guestId", guest.id);

    startTransition(async () => {
      const result = await toggleGuestBan(fd);
      if (result.ok && !result.nowBanned) {
        toast.success("Convidado desbanido");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 border rounded-lg p-3 mb-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{guest.name}</p>
        <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
      </div>
      <button
        onClick={unban}
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded bg-muted hover:bg-muted/80 font-medium shrink-0"
      >
        Desbanir
      </button>
    </div>
  );
}
