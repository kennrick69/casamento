"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { approvePhoto, removePhoto } from "./actions";

interface Props {
  eventId: string;
  photoId: string;
  showApprove: boolean;
}

export function PhotoCardActions({ eventId, photoId, showApprove }: Props) {
  const [isApprovePending, startApproveTransition] = useTransition();
  const [isRemovePending, startRemoveTransition] = useTransition();

  function handleApprove() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("photoId", photoId);
    startApproveTransition(async () => {
      const result = await approvePhoto(fd);
      if (result.ok) toast.success("Foto aprovada!");
    });
  }

  function handleRemove() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("photoId", photoId);
    startRemoveTransition(async () => {
      const result = await removePhoto(fd);
      if (result.ok) toast.success("Foto removida.");
    });
  }

  return (
    <div className="flex gap-1">
      {showApprove && (
        <button
          onClick={handleApprove}
          disabled={isApprovePending || isRemovePending}
          className="flex-1 text-xs py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
        >
          {isApprovePending ? "Aprovando…" : "Aprovar"}
        </button>
      )}
      <button
        onClick={handleRemove}
        disabled={isApprovePending || isRemovePending}
        className="flex-1 text-xs py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
      >
        {isRemovePending ? "Removendo…" : "Remover"}
      </button>
    </div>
  );
}
