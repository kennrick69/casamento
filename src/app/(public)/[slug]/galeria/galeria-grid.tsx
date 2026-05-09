"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GaleriaPhoto {
  id: string;
  url: string;
  caption: string | null;
}

export function GaleriaGrid({ photos }: { photos: GaleriaPhoto[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function open(index: number) { setLightboxIndex(index); }
  function close() { setLightboxIndex(null); }
  function prev() { setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)); }
  function next() { setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length)); }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => open(idx)}
            className="relative aspect-square overflow-hidden rounded-[var(--theme-radius)] bg-[var(--theme-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? `Foto ${idx + 1}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={close}
            aria-label="Fechar"
          >
            <X size={28} />
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Anterior"
          >
            <ChevronLeft size={36} />
          </button>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Próxima"
          >
            <ChevronRight size={36} />
          </button>

          <div
            className="relative w-full max-w-2xl max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption ?? `Foto ${lightboxIndex + 1}`}
              width={800}
              height={600}
              className="object-contain w-full h-full max-h-[80vh]"
              priority
            />
          </div>

          {photos[lightboxIndex].caption && (
            <p className="text-white/80 text-sm mt-4 text-center max-w-sm px-4">
              {photos[lightboxIndex].caption}
            </p>
          )}
          <p className="text-white/40 text-xs mt-2">
            {lightboxIndex + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
