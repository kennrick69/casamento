"use client";

import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { approvePhoto, removePhoto } from "../mural/actions";

interface Photo {
  id: string;
  photoUrl: string;
  guest: { name: string };
  caption: string | null;
}

export function MuralActions({ photo, eventId }: { photo: Photo; eventId: string }) {
  const [isPending, startTransition] = useTransition();

  function act(action: "approve" | "remove") {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("photoId", photo.id);

    startTransition(async () => {
      const result = action === "approve" ? await approvePhoto(fd) : await removePhoto(fd);
      if (result.ok) {
        toast.success(action === "approve" ? "Foto aprovada" : "Foto removida");
      }
    });
  }

  return (
    <div className="flex gap-3 border rounded-lg p-3 mb-3">
      <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden bg-muted">
        <Image
          src={photo.photoUrl}
          alt={photo.caption ?? "Foto"}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{photo.guest.name}</p>
        {photo.caption && (
          <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={() => act("approve")}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded bg-green-100 text-green-800 hover:bg-green-200 font-medium"
        >
          Aprovar
        </button>
        <button
          onClick={() => act("remove")}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded bg-red-100 text-red-800 hover:bg-red-200 font-medium"
        >
          Remover
        </button>
      </div>
    </div>
  );
}
