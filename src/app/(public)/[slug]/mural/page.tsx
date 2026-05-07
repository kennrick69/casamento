import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { PhotoUploader } from "./photo-uploader";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mural de fotos" };

export default async function MuralPage({
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

  const { event, guest } = result;

  const features = event.features as Record<string, boolean>;
  if (features.photoWall === false) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <p className="text-[var(--theme-secondary)] text-sm mt-8">
          Mural de fotos não disponível.
        </p>
      </div>
    );
  }

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id, removedAt: null, approvedByCouple: true },
    orderBy: { createdAt: "desc" },
    include: { guest: { select: { name: true } } },
    take: 60,
  });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          Mural de fotos
        </h1>
        {guest && (
          <PhotoUploader slug={slug} guestId={guest.id} />
        )}
      </div>

      {!guest && (
        <div className="text-sm text-[var(--theme-secondary)] rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3">
          <a href={`/${slug}/rsvp`} className="underline font-medium">
            Confirme sua presença
          </a>{" "}
          para enviar fotos.
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-sm text-[var(--theme-secondary)] text-center py-10">
          Nenhuma foto ainda. Seja o primeiro a enviar!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-[var(--theme-radius)] overflow-hidden bg-[var(--theme-muted)]"
            >
              <Image
                src={`/api/photos/${encodeURIComponent(photo.storageKey)}`}
                alt={photo.caption ?? `Foto de ${photo.guest.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
