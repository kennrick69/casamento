"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleFulfilled, deleteGift } from "./actions";

interface Props {
  eventId: string;
  giftId: string;
  fulfilled: boolean;
  reserved: boolean;
}

export function GiftItemActions({ eventId, giftId, fulfilled, reserved }: Props) {
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleToggle() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("giftId", giftId);
    fd.set("fulfilled", String(fulfilled));
    startToggleTransition(async () => {
      const result = await toggleFulfilled(fd);
      if (result.ok) {
        toast.success(result.nowFulfilled ? "Presente marcado como recebido!" : "Presente desmarcado.");
      }
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("giftId", giftId);
    startDeleteTransition(async () => {
      const result = await deleteGift(fd);
      if (result.ok) toast.success("Presente removido.");
    });
  }

  return (
    <div className="flex gap-1 shrink-0">
      <button
        onClick={handleToggle}
        disabled={isTogglePending || isDeletePending}
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          fulfilled
            ? "border-green-500 text-green-700 bg-green-50"
            : "border-border text-muted-foreground hover:bg-muted"
        } disabled:opacity-60`}
      >
        {isTogglePending
          ? fulfilled ? "Desmarcando…" : "Marcando…"
          : fulfilled ? "Recebido" : "Marcar recebido"}
      </button>
      {!reserved && (
        <button
          onClick={handleDelete}
          disabled={isTogglePending || isDeletePending}
          className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          {isDeletePending ? "Removendo…" : "Remover"}
        </button>
      )}
    </div>
  );
}
