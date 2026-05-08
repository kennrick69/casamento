"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resolveReport } from "./actions";

interface Props {
  eventId: string;
  reportId: string;
  photoId?: string | null;
  chatMessageId?: string | null;
}

export function ReportActions({ eventId, reportId, photoId, chatMessageId }: Props) {
  const [isRemovePending, startRemoveTransition] = useTransition();
  const [isDismissPending, startDismissTransition] = useTransition();

  function handleAction(action: "REMOVED" | "DISMISSED") {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("reportId", reportId);
    fd.set("action", action);
    if (photoId) fd.set("photoId", photoId);
    if (chatMessageId) fd.set("chatMessageId", chatMessageId);

    const start = action === "REMOVED" ? startRemoveTransition : startDismissTransition;
    start(async () => {
      const result = await resolveReport(fd);
      if (result.ok) {
        toast.success(action === "REMOVED" ? "Conteúdo removido." : "Denúncia descartada.");
      }
    });
  }

  const anyPending = isRemovePending || isDismissPending;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction("REMOVED")}
        disabled={anyPending}
        className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {isRemovePending ? "Removendo…" : "Remover conteúdo"}
      </button>
      <button
        onClick={() => handleAction("DISMISSED")}
        disabled={anyPending}
        className="text-sm px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors disabled:opacity-60"
      >
        {isDismissPending ? "Descartando…" : "Descartar"}
      </button>
    </div>
  );
}
