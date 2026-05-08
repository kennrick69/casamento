"use client";

import { useTransition } from "react";
import { reserveGift } from "./actions";

export function ReserveButton({
  giftId,
  slug,
  reserved,
}: {
  giftId: string;
  slug: string;
  reserved: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("giftId", giftId);
      fd.set("slug", slug);
      await reserveGift(fd);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`text-sm px-3 py-1.5 rounded-[var(--theme-radius)] border transition-colors w-fit ${
        reserved
          ? "border-[var(--theme-primary)] text-[var(--theme-primary)] bg-transparent"
          : "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] border-[var(--theme-primary)]"
      }`}
    >
      {isPending ? (reserved ? "Cancelando…" : "Reservando…") : reserved ? "Cancelar reserva" : "Reservar presente"}
    </button>
  );
}
