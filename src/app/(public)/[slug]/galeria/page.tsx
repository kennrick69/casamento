import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { GaleriaGrid } from "./galeria-grid";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Galeria do casal" };

export default async function GaleriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;

  const result = await validateEventAccess(slug, k ?? null);
  if (!result.ok) notFound();

  const { event } = result;

  const photos = await prisma.galleryPhoto.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
  });

  const photosWithUrls = photos.map((p) => ({
    id: p.id,
    url: storage.getUrl(p.storageKey),
    caption: p.caption,
  }));

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <h1
        className="text-2xl font-semibold"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Galeria do casal
      </h1>

      {photosWithUrls.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <p className="text-4xl">📷</p>
          <p className="text-sm text-[var(--theme-secondary)]">
            As fotos do casal serão publicadas em breve.
          </p>
        </div>
      ) : (
        <GaleriaGrid photos={photosWithUrls} />
      )}
    </div>
  );
}
