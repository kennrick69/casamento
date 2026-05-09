"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  order: number;
}

export function GaleriaAdminClient({ photos: initial, eventId }: { photos: Photo[]; eventId: string }) {
  const [photos, setPhotos] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList) {
    setUploading(true);
    const results: Photo[] = [];

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);

      const res = await fetch("/api/admin/galeria/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (data.ok) {
        results.push({ id: data.id, url: data.url, caption: null, order: photos.length + results.length });
      } else {
        toast.error(data.error ?? "Erro no upload");
      }
    }

    if (results.length > 0) {
      setPhotos((prev) => [...prev, ...results]);
      toast.success(`${results.length} foto${results.length > 1 ? "s" : ""} adicionada${results.length > 1 ? "s" : ""}`);
    }
    setUploading(false);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/galeria/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        toast.success("Foto removida");
      } else {
        toast.error("Erro ao remover foto");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upload area */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm">Enviando…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload size={32} />
            <p className="text-sm font-medium">Clique ou arraste fotos aqui</p>
            <p className="text-xs">JPG, PNG, WebP · Máximo 10 MB por foto</p>
          </div>
        )}
      </div>

      {/* Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={photo.url}
                alt={photo.caption ?? "Foto"}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Button
                  size="icon"
                  variant="destructive"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(photo.id)}
                  disabled={isPending}
                  aria-label="Remover foto"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma foto na galeria ainda.
        </p>
      )}
    </div>
  );
}
