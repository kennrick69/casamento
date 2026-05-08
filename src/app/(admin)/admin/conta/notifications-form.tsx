"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateNotifications } from "./actions";

export function NotificationsForm({ marketingOptIn }: { marketingOptIn: boolean }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = await updateNotifications(fd);
      if (result.ok) {
        toast.success("Preferências salvas!");
      } else {
        toast.error("Erro ao salvar preferências.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="marketingOptIn"
          defaultChecked={marketingOptIn}
          className="mt-0.5 size-4"
        />
        <span className="text-sm">Receber novidades, dicas de planejamento e atualizações do Voem.</span>
      </label>
      <Button type="submit" disabled={isPending} className="h-11 self-start px-6">
        {isPending ? "Salvando…" : "Salvar preferências"}
      </Button>
    </form>
  );
}
