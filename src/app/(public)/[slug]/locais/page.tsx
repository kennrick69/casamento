import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { prisma } from "@/lib/db";
import {
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_ICONS,
  generateMapsLink,
  generateWazeLink,
} from "@/lib/locations";
import { formatEventDate } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLink, Navigation } from "lucide-react";
import type { EventLocation } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Locais" };

export default async function LocaisPage({
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

  const locations = await prisma.eventLocation.findMany({
    where: { eventId: event.id, isPublic: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <h1
        className="text-2xl font-semibold"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Locais do evento
      </h1>

      {locations.length === 0 ? (
        <p className="text-sm text-[var(--theme-secondary)]">
          Os locais ainda não foram publicados.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {locations.map((loc) => (
            <LocationCard key={loc.id} location={loc} timezone={event.timezone} />
          ))}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  location: loc,
  timezone,
}: {
  location: EventLocation;
  timezone: string;
}) {
  const typeLabel = LOCATION_TYPE_LABELS[loc.type];
  const typeIcon = LOCATION_TYPE_ICONS[loc.type];
  const query = loc.address ?? loc.title;
  const mapsHref = generateMapsLink(query);
  const wazeHref = generateWazeLink(query);

  return (
    <div className="flex flex-col gap-3 rounded-[var(--theme-radius)] border border-[var(--theme-border)] p-4">
      <div>
        <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-1">
          {typeIcon} {typeLabel}
        </p>
        <p className="font-semibold text-base">{loc.title}</p>
        {loc.address && (
          <p className="text-sm text-[var(--theme-secondary)] mt-0.5">{loc.address}</p>
        )}
      </div>

      {(loc.date || loc.timeLabel) && (
        <p className="text-sm text-[var(--theme-secondary)]">
          {loc.date
            ? formatEventDate(loc.date, timezone, "d 'de' MMMM")
            : ""}
          {loc.date && loc.timeLabel ? " · " : ""}
          {loc.timeLabel ?? ""}
        </p>
      )}

      {loc.dresscode && (
        <p className="text-sm">
          Traje: <span className="font-medium">{loc.dresscode}</span>
        </p>
      )}

      {loc.description && (
        <p className="text-sm text-[var(--theme-secondary)] leading-relaxed">
          {loc.description}
        </p>
      )}

      <div className="flex gap-2">
        <a
          href={wazeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "outline",
            className: "flex-1 h-11 gap-2 text-sm justify-center",
          })}
        >
          <Navigation size={15} />
          Waze
        </a>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "outline",
            className: "flex-1 h-11 gap-2 text-sm justify-center",
          })}
        >
          <ExternalLink size={15} />
          Maps
        </a>
      </div>
    </div>
  );
}
