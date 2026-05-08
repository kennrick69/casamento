"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { approvePhoto, removePhoto, batchApprovePhotos, batchRemovePhotos } from "./actions";

interface Photo {
  id: string;
  storageKey: string;
  approvedByCouple: boolean;
  caption: string | null;
  guest: { name: string };
  reactionCounts: Record<string, number>;
}

type Filter = "all" | "pending" | "approved";

export function MuralAdminClient({
  photos,
  eventId,
  baseUrl,
  pendingCount,
  approvedCount,
}: {
  photos: Photo[];
  eventId: string;
  baseUrl: string;
  pendingCount: number;
  approvedCount: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBatchPending, startBatch] = useTransition();

  const visible = photos.filter((p) => {
    if (filter === "pending") return !p.approvedByCouple;
    if (filter === "approved") return p.approvedByCouple;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApproveAll() {
    startBatch(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      const result = await batchApprovePhotos(fd);
      if (result.ok) toast.success(`${result.count} foto${result.count !== 1 ? "s" : ""} aprovada${result.count !== 1 ? "s" : ""}!`);
    });
  }

  function handleRemoveSelected() {
    if (selected.size === 0) return;
    startBatch(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      for (const id of selected) fd.append("photoId", id);
      const result = await batchRemovePhotos(fd);
      if (result.ok) {
        toast.success(`${result.count} foto${result.count !== 1 ? "s" : ""} removida${result.count !== 1 ? "s" : ""}.`);
        setSelected(new Set());
      }
    });
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {(["all", "pending", "approved"] as Filter[]).map((f) => {
          const labels = { all: `Todas (${photos.length})`, pending: `Pendentes (${pendingCount})`, approved: `Aprovadas (${approvedCount})` };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${filter === f ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Batch actions toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 min-h-[36px]">
        {pendingCount > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={isBatchPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            ✓ Aprovar todas pendentes ({pendingCount})
          </button>
        )}
        {selected.size > 0 && (
          <>
            <span className="text-xs text-muted-foreground">{selected.size} selecionada{selected.size !== 1 ? "s" : ""}</span>
            <button
              onClick={handleRemoveSelected}
              disabled={isBatchPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              Remover selecionadas
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar seleção
            </button>
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma foto neste filtro.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              eventId={eventId}
              baseUrl={baseUrl}
              isSelected={selected.has(photo.id)}
              onToggleSelect={() => toggleSelect(photo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  eventId,
  baseUrl,
  isSelected,
  onToggleSelect,
}: {
  photo: Photo;
  eventId: string;
  baseUrl: string;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const [isApprovePending, startApprove] = useTransition();
  const [isRemovePending, startRemove] = useTransition();
  const src = `${baseUrl}/api/photos/${encodeURIComponent(photo.storageKey)}`;
  const totalReactions = Object.values(photo.reactionCounts).reduce((a, b) => a + b, 0);

  function handleApprove() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("photoId", photo.id);
    startApprove(async () => {
      const result = await approvePhoto(fd);
      if (result.ok) toast.success("Foto aprovada!");
    });
  }

  function handleRemove() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("photoId", photo.id);
    startRemove(async () => {
      const result = await removePhoto(fd);
      if (result.ok) toast.success("Foto removida.");
    });
  }

  return (
    <div className={`border rounded-lg overflow-hidden flex flex-col ${isSelected ? "ring-2 ring-primary" : ""}`}>
      <div className="relative aspect-square bg-muted cursor-pointer" onClick={onToggleSelect}>
        <Image src={src} alt={photo.guest.name} fill className="object-cover" unoptimized />
        {isSelected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">✓</span>
          </div>
        )}
        {!photo.approvedByCouple && (
          <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
            Pendente
          </div>
        )}
        {totalReactions > 0 && (
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
            {totalReactions} ❤
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col gap-1">
        <p className="text-xs text-muted-foreground truncate">{photo.guest.name}</p>
        {photo.caption && <p className="text-xs truncate">{photo.caption}</p>}
        <div className="flex gap-1">
          {!photo.approvedByCouple && (
            <button
              onClick={handleApprove}
              disabled={isApprovePending || isRemovePending}
              className="flex-1 text-xs py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {isApprovePending ? "…" : "Aprovar"}
            </button>
          )}
          <button
            onClick={handleRemove}
            disabled={isApprovePending || isRemovePending}
            className="flex-1 text-xs py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {isRemovePending ? "…" : "Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}
