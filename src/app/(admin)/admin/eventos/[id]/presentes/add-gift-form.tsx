"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { createGift } from "./actions";

export function AddGiftForm({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = await createGift(fd);
      if (result.ok) {
        formRef.current?.reset();
        toast.success("Presente adicionado!");
      } else {
        toast.error(result.error ?? "Erro ao adicionar presente.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3 border rounded-lg p-4 mb-6 bg-muted/40">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs font-medium">Nome *</label>
          <input name="name" required maxLength={120} placeholder="Jogo de panelas" className="border rounded px-3 py-2 text-sm bg-background" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Preço estimado (R$)</label>
          <input name="price" type="number" min="0" step="0.01" placeholder="450.00" className="border rounded px-3 py-2 text-sm bg-background" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Link (opcional)</label>
          <input name="externalLink" type="url" placeholder="https://..." className="border rounded px-3 py-2 text-sm bg-background" />
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs font-medium">Descrição (opcional)</label>
          <input name="description" maxLength={300} placeholder="Conjunto 5 peças antiaderente" className="border rounded px-3 py-2 text-sm bg-background" />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="self-start text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {isPending ? "Adicionando…" : "Adicionar presente"}
      </button>
    </form>
  );
}
