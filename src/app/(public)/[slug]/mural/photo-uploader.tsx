"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB after compression
const CAPTION_MAX = 280;

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const MAX_DIM = 1920;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao carregar imagem")); };
    img.src = url;
  });
}

export function PhotoUploader({ slug, guestId }: { slug: string; guestId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são aceitas.");
      return;
    }
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    const compressed = await compressImage(file).catch(() => file);
    setPendingFile(compressed);
  }, []);

  function cancel() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    setCaption("");
    setError(null);
  }

  function submit() {
    if (!pendingFile) return;
    if (pendingFile.size > MAX_SIZE_BYTES) {
      setError("Imagem muito grande mesmo após compressão. Tente outra foto.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", pendingFile);
      fd.set("slug", slug);
      fd.set("guestId", guestId);
      if (caption.trim()) fd.set("caption", caption.trim().slice(0, CAPTION_MAX));

      const res = await fetch("/api/fotos/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({ error: "Falha ao enviar." }))) as { error: string };
        setError(msg);
        return;
      }
      cancel();
      router.refresh();
    });
  }

  if (preview) {
    return (
      <div className="fixed inset-0 z-40 bg-black/80 flex items-end justify-center p-4">
        <div className="bg-background rounded-2xl w-full max-w-sm p-4 flex flex-col gap-3">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
            <Image src={preview} alt="Pré-visualização" fill className="object-cover" unoptimized />
          </div>
          <label htmlFor="photo-caption" className="sr-only">Legenda (opcional)</label>
          <textarea
            id="photo-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
            placeholder="Adicione uma legenda… (opcional)"
            rows={2}
            aria-label="Legenda da foto (opcional)"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground text-right -mt-2">{caption.length}/{CAPTION_MAX}</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={cancel}
              disabled={isPending}
              className="flex-1 text-sm py-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="flex-1 text-sm py-2 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] disabled:opacity-60 transition-opacity"
            >
              {isPending ? "Enviando…" : "Publicar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="text-sm px-3 py-1.5 rounded-[var(--theme-radius)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] disabled:opacity-60 transition-opacity"
      >
        {isPending ? "Enviando…" : "+ Foto"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[160px] text-right">{error}</p>}
    </div>
  );
}
