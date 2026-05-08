import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { PhotoUploader } from "./photo-uploader";
import { PhotoGrid } from "./photo-grid";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mural de fotos" };

const PAGE_SIZE = 20;

export default async function MuralPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string; all?: string }>;
}) {
  const { slug } = await params;
  const { k, all } = await searchParams;

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

  const showAll = all === "1";
  const take = showAll ? undefined : PAGE_SIZE;

  const [photos, totalCount] = await Promise.all([
    prisma.photo.findMany({
      where: { eventId: event.id, removedAt: null, approvedByCouple: true },
      orderBy: { createdAt: "desc" },
      include: {
        guest: { select: { name: true } },
        reactions: { select: { emoji: true } },
      },
      take,
    }),
    prisma.photo.count({
      where: { eventId: event.id, removedAt: null, approvedByCouple: true },
    }),
  ]);

  const photosWithCounts = photos.map((p) => {
    const counts: Record<string, number> = {};
    for (const r of p.reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }
    return { ...p, reactionCounts: counts };
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
        {guest && <PhotoUploader slug={slug} guestId={guest.id} />}
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
        <>
          <PhotoGrid photos={photosWithCounts} slug={slug} />
          {!showAll && totalCount > PAGE_SIZE && (
            <a
              href={`/${slug}/mural?k=${k ?? ""}&all=1`}
              className="block text-center text-sm underline underline-offset-2 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors"
            >
              Ver todas as {totalCount} fotos
            </a>
          )}
        </>
      )}
    </div>
  );
}
