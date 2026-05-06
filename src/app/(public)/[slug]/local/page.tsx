import { notFound } from "next/navigation";
import { validateEventAccess } from "@/lib/auth/guest";
import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Local" };

export default async function LocalPage({
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

  const wazeBase = "https://waze.com/ul?q=";
  const mapsBase = "https://maps.google.com/?q=";
  const ceremonyQuery = encodeURIComponent(
    event.ceremonyAddress ?? event.ceremonyLocation ?? ""
  );
  const receptionQuery = encodeURIComponent(
    event.receptionAddress ?? event.receptionLocation ?? ""
  );

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
      <h1
        className="text-2xl font-semibold"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Local do evento
      </h1>

      {/* Cerimônia */}
      {event.ceremonyLocation && (
        <LocationCard
          title="Cerimônia"
          name={event.ceremonyLocation}
          address={event.ceremonyAddress}
          wazeHref={`${wazeBase}${ceremonyQuery}`}
          mapsHref={event.mapsLink ?? `${mapsBase}${ceremonyQuery}`}
        />
      )}

      {/* Recepção */}
      {event.receptionLocation && event.receptionLocation !== event.ceremonyLocation && (
        <LocationCard
          title="Recepção"
          name={event.receptionLocation}
          address={event.receptionAddress}
          wazeHref={`${wazeBase}${receptionQuery}`}
          mapsHref={`${mapsBase}${receptionQuery}`}
        />
      )}

      {/* Dresscode */}
      {event.dresscode && (
        <div className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] px-4 py-3">
          <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-1">
            Traje
          </p>
          <p className="font-medium">{event.dresscode}</p>
        </div>
      )}
    </div>
  );
}

function LocationCard({
  title,
  name,
  address,
  wazeHref,
  mapsHref,
}: {
  title: string;
  name: string;
  address: string | null;
  wazeHref: string;
  mapsHref: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--theme-radius)] border border-[var(--theme-border)] p-4">
      <div>
        <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-0.5">
          {title}
        </p>
        <div className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--theme-secondary)]" />
          <div>
            <p className="font-semibold">{name}</p>
            {address && (
              <p className="text-sm text-[var(--theme-secondary)]">{address}</p>
            )}
          </div>
        </div>
      </div>
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
