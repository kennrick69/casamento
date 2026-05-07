"use client";

import { useTransition } from "react";
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
      aria-label={voted ? "Remover voto" : "Votar"}
      className={`flex flex-col items-center gap-0.5 min-w-[2.5rem] transition-colors ${
        disabled ? "opacity-40 cursor-default" : "cursor-pointer"
      }`}
    >
      <span className={`text-lg ${voted ? "text-[var(--theme-accent)]" : "text-[var(--theme-secondary)]"}`}>
        ♥
      </span>
      <span className="text-xs tabular-nums">{votes}</span>
    </button>
  );
}
