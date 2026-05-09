import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nossa história" };

export default async function HistoriaPage({
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

  const items = await prisma.coupleStoryItem.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <div className="text-center mb-2">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--theme-font-heading)" }}
        >
          Nossa história
        </h1>
        <p className="text-sm text-[var(--theme-secondary)]">{event.coupleNames}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <p className="text-4xl">💌</p>
          <p className="text-sm text-[var(--theme-secondary)]">
            A história do casal será publicada em breve.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-0">
          {/* Linha central da timeline */}
          <div className="absolute left-[calc(50%-1px)] top-0 bottom-0 w-0.5 bg-[var(--theme-border)]" aria-hidden="true" />

          {items.map((item, idx) => {
            const isLeft = idx % 2 === 0;
            const photoUrl = item.photoKey ? storage.getUrl(item.photoKey) : null;
            const dateStr = item.dateLabel
              ? item.dateLabel
              : item.date
                ? format(item.date, "MMMM 'de' yyyy", { locale: ptBR })
                : null;

            return (
              <div key={item.id} className={`relative flex items-start mb-10 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
                {/* Dot */}
                <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--theme-primary)] border-2 border-[var(--theme-background)] mt-5 z-10" />

                {/* Card */}
                <div className={`w-[46%] ${isLeft ? "mr-auto pr-4" : "ml-auto pl-4"}`}>
                  <div className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-background)] p-4 shadow-sm flex flex-col gap-3">
                    {photoUrl && (
                      <div className="relative aspect-video rounded overflow-hidden">
                        <Image
                          src={photoUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 46vw"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {dateStr && (
                      <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider">
                        {dateStr}
                      </p>
                    )}
                    <p
                      className="font-semibold text-sm leading-snug"
                      style={{ fontFamily: "var(--theme-font-heading)" }}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-[var(--theme-secondary)] leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Spacer */}
                <div className="w-[46%]" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
