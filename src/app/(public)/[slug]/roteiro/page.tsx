import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Roteiro" };

export default async function RoteirocPage({
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

  const items = await prisma.journeyItem.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1
        className="text-2xl font-semibold mb-1"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Roteiro do dia
      </h1>
      <p className="text-sm text-[var(--theme-secondary)] mb-6">
        Horários no fuso de {event.timezone === "America/Sao_Paulo" ? "Brasília" : event.timezone}
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--theme-secondary)]">
          O roteiro ainda não foi publicado.
        </p>
      ) : (
        <ol className="relative border-l border-[var(--theme-border)] flex flex-col gap-0">
          {items.map((item, i) => (
            <li key={item.id} className="ml-6 pb-8 last:pb-0">
              {/* Bolinha na linha do tempo */}
              <span className="absolute -left-[11px] flex size-5 items-center justify-center rounded-full border-2 border-[var(--theme-primary)] bg-[var(--theme-background)]">
                <Calendar size={10} className="text-[var(--theme-primary)]" />
              </span>

              <div className="flex flex-col gap-0.5">
                <time className="text-xs font-mono text-[var(--theme-secondary)] tabular-nums">
                  {item.time}
                  {i === 0 && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--theme-secondary)]">
                      horário de chegada
                    </span>
                  )}
                </time>
                <h3 className="font-semibold text-base leading-snug">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-[var(--theme-secondary)]">{item.description}</p>
                )}
                {item.location && (
                  <p className="text-xs text-[var(--theme-secondary)] mt-0.5">
                    📍 {item.location}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
