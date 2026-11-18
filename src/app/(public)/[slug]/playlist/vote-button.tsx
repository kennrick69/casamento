"use client";

import { useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleVote } from "./actions";

export function VoteButton({
  suggestionId,
  slug,
  votes,
  voted,
  disabled,
}: {
  suggestionId: string;
  slug: string;
  votes: number;
  voted: boolean;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (disabled) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("suggestionId", suggestionId);
      fd.set("slug", slug);
      await toggleVote(fd);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || disabled}
      aria-label={isPending ? "Processando…" : voted ? "Remover voto" : "Votar"}
      className={`flex flex-col items-center gap-0.5 min-w-[2.5rem] transition-all ${
        disabled ? "opacity-40 cursor-default" : isPending ? "opacity-50 cursor-wait" : "cursor-pointer"
      }`}
    >
      <span className={`${voted ? "text-[var(--theme-accent)]" : "text-[var(--theme-secondary)]"}`}>
        <Heart className="size-5" fill={voted ? "currentColor" : "none"} aria-hidden />
      </span>
      <span className="text-xs tabular-nums">{votes}</span>
    </button>
  );
}
