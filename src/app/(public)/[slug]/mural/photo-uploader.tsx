"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PhotoUploader({ slug, guestId }: { slug: string; guestId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são aceitas.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo: 8 MB.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("slug", slug);
      fd.set("guestId", guestId);

      const res = await fetch("/api/fotos/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({ error: "Falha ao enviar. Tente novamente." }))) as {
          error: string;
        };
        setError(msg);
        return;
      }
      router.refresh();
    });
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
      {error && (
        <p className="text-xs text-red-600 mt-1 max-w-[160px] text-right">{error}</p>
      )}
    </div>
  );
}
