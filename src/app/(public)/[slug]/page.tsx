import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, ChevronRight, MapPin, Shirt, Gift, Camera, Music, Heart, Calendar } from "lucide-react";
import { validateEventAccess } from "@/lib/auth/guest";
import { formatEventDate } from "@/lib/timezone";
import { LandingHero } from "@/components/guest/landing-hero";
import { Countdown } from "@/components/guest/countdown";
import { buttonVariants } from "@/components/ui/button";
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_ICONS, generateMapsLink } from "@/lib/locations";
import { prisma } from "@/lib/db";
import type { EventLocation, WeddingPartyMember } from "@prisma/client";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { coupleNames: true, ceremonyDate: true },
  });
  if (!event) return { title: slug };
  const dateStr = event.ceremonyDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return {
    title: event.coupleNames,
    description: `Casamento de ${event.coupleNames} — ${dateStr}`,
    openGraph: {
      title: `Casamento de ${event.coupleNames}`,
      description: `${dateStr} · Convite interativo`,
      type: "website",
    },
  };
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;

  const result = await validateEventAccess(slug, k ?? null);

  if (!result.ok) {
    if (result.error === "NOT_FOUND" || result.error === "ARCHIVED") notFound();
    return <InvalidTokenScreen slug={slug} />;
  }

  const { event, guest } = result;

  const [locations, weddingParty, storyItems] = await Promise.all([
    prisma.eventLocation.findMany({
      where: { eventId: event.id, isPublic: true },
      orderBy: { order: "asc" },
    }),
    prisma.weddingPartyMember.findMany({
      where: { eventId: event.id },
      orderBy: [{ side: "asc" }, { order: "asc" }],
    }),
    prisma.coupleStoryItem.findMany({
      where: { eventId: event.id },
      orderBy: { order: "asc" },
      take: 1,
    }),
  ]);

  const paletteColors = event.paletteColors as Record<string, string> | null;
  const features = event.features as Record<string, boolean>;

  const rsvpHref = `/${slug}/rsvp${k ? `?k=${k}` : ""}`;

  return (
    <div className="flex flex-col min-h-screen">
      <LandingHero
        coupleNames={event.coupleNames}
        coverImageKey={event.coverImageKey}
        paletteColors={paletteColors}
      />

      <div className="flex flex-col">
        {/* Countdown */}
        <section id="data" className="text-center px-4 py-8 border-b border-[var(--theme-border)]">
          <p
            className="text-sm text-[var(--theme-secondary)] mb-3 uppercase tracking-wider"
            style={{ fontFamily: "var(--theme-font-body)" }}
          >
            {formatEventDate(event.ceremonyDate, event.timezone, "EEEE, d 'de' MMMM 'de' yyyy")}
          </p>
          <Countdown targetDate={event.ceremonyDate} timezone={event.timezone} />
        </section>

        {/* RSVP CTA / guest status */}
        <section className="px-4 py-6 border-b border-[var(--theme-border)]">
          {guest?.rsvpStatus === "CONFIRMED" && (
            <ConfirmedBanner name={guest.name} slug={slug} gamification={features.gamification} />
          )}
          {guest?.rsvpStatus === "DECLINED" && (
            <DeclinedBanner slug={slug} rsvpHref={rsvpHref} />
          )}
          {(!guest || guest.rsvpStatus === "PENDING") && (
            <RsvpCtaBanner slug={slug} rsvpHref={rsvpHref} />
          )}
        </section>

        {/* Descrição do evento */}
        {event.description && (
          <section className="px-4 py-6 border-b border-[var(--theme-border)]">
            <p
              className="text-sm text-[var(--theme-secondary)] leading-relaxed text-center max-w-sm mx-auto"
              style={{ fontFamily: "var(--theme-font-body)" }}
            >
              {event.description}
            </p>
          </section>
        )}

        {/* Locais */}
        {locations.length > 0 && (
          <section id="locais" className="px-4 py-6 border-b border-[var(--theme-border)]">
            <SectionTitle icon={<MapPin size={18} />} label="Locais" />
            <div className="flex flex-col gap-6 mt-4">
              {locations.map((loc) => (
                <LocationCard key={loc.id} loc={loc} timezone={event.timezone} />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href={`/${slug}/locais${k ? `?k=${k}` : ""}`}
                className="text-sm text-[var(--theme-primary)] underline underline-offset-2"
              >
                Ver todos os locais →
              </Link>
            </div>
          </section>
        )}

        {/* Traje */}
        {event.dresscode && (
          <section id="traje" className="px-4 py-4 border-b border-[var(--theme-border)]">
            <div className="flex items-center gap-3">
              <Shirt size={18} className="shrink-0 text-[var(--theme-secondary)]" />
              <p className="text-sm">
                Traje:{" "}
                <span className="font-medium text-[var(--theme-foreground)]">{event.dresscode}</span>
              </p>
            </div>
          </section>
        )}

        {/* Padrinhos e Madrinhas */}
        {weddingParty.length > 0 && (
          <section id="padrinhos" className="px-4 py-6 border-b border-[var(--theme-border)]">
            <SectionTitle icon={<Heart size={18} />} label="Padrinhos e Madrinhas" />
            <WeddingPartySection members={weddingParty} />
          </section>
        )}

        {/* História do casal */}
        {storyItems.length > 0 && (
          <section id="historia" className="px-4 py-6 border-b border-[var(--theme-border)]">
            <SectionTitle icon={<Calendar size={18} />} label="Nossa história" />
            <p className="text-sm text-[var(--theme-secondary)] mt-2 mb-4">
              Uma jornada de amor e cumplicidade.
            </p>
            <Link
              href={`/${slug}/historia${k ? `?k=${k}` : ""}`}
              className={buttonVariants({ variant: "outline", className: "w-full h-12 justify-center" })}
            >
              Ver nossa história →
            </Link>
          </section>
        )}

        {/* Presentes / PIX */}
        {features.donations !== false && (
          <section id="presentes" className="px-4 py-6 border-b border-[var(--theme-border)]">
            <SectionTitle icon={<Gift size={18} />} label="Presentes" />
            {event.pixKey && (
              <div className="mt-3 mb-4 bg-[var(--theme-muted)] rounded-[var(--theme-radius)] p-4 text-center">
                <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-1">Chave PIX</p>
                <p className="font-mono text-sm font-medium break-all select-all">{event.pixKey}</p>
              </div>
            )}
            <Link
              href={`/${slug}/presentes${k ? `?k=${k}` : ""}`}
              className={buttonVariants({ variant: "outline", className: "w-full h-12 justify-center" })}
            >
              Ver lista de presentes →
            </Link>
          </section>
        )}

        {/* Galeria + Mural + Playlist */}
        <section className="px-4 py-6 flex flex-col gap-3">
          <SectionTitle icon={<Camera size={18} />} label="Memórias" />
          <div className="flex flex-col gap-3 mt-2">
            <Link
              href={`/${slug}/galeria${k ? `?k=${k}` : ""}`}
              className={buttonVariants({ variant: "outline", className: "w-full h-12 justify-start gap-3" })}
            >
              <Camera size={18} />
              Galeria do casal
            </Link>
            {features.photoWall !== false && (
              <Link
                href={`/${slug}/mural${k ? `?k=${k}` : ""}`}
                className={buttonVariants({ variant: "outline", className: "w-full h-12 justify-start gap-3" })}
              >
                <Camera size={18} />
                Mural de fotos dos convidados
              </Link>
            )}
            {features.playlist !== false && (
              <Link
                href={`/${slug}/playlist${k ? `?k=${k}` : ""}`}
                className={buttonVariants({ variant: "outline", className: "w-full h-12 justify-start gap-3" })}
              >
                <Music size={18} />
                Sugerir música para a festa
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Seções auxiliares ─────────────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--theme-foreground)]">
      <span className="text-[var(--theme-secondary)]">{icon}</span>
      <h2
        className="text-lg font-semibold"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        {label}
      </h2>
    </div>
  );
}

function LocationCard({ loc, timezone }: { loc: EventLocation; timezone: string }) {
  const typeLabel = LOCATION_TYPE_LABELS[loc.type];
  const typeIcon = LOCATION_TYPE_ICONS[loc.type];
  const query = loc.address ?? loc.title;
  const mapsHref = generateMapsLink(query);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider mb-1">
          {typeIcon} {typeLabel}
        </p>
        <p className="font-medium text-sm">{loc.title}</p>
        {loc.address && (
          <p className="text-xs text-[var(--theme-secondary)] mt-0.5">{loc.address}</p>
        )}
        {loc.date && (
          <p className="text-xs text-[var(--theme-secondary)] mt-0.5">
            {formatEventDate(loc.date, timezone, "d 'de' MMMM · HH:mm")}
            {loc.timeLabel ? ` — ${loc.timeLabel}` : ""}
          </p>
        )}
        {loc.dresscode && (
          <p className="text-xs text-[var(--theme-secondary)] mt-0.5">
            Traje: {loc.dresscode}
          </p>
        )}
      </div>
      {/* Google Maps embed */}
      {loc.address && (
        <div className="rounded-[var(--theme-radius)] overflow-hidden border border-[var(--theme-border)]" style={{ height: 180 }}>
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=15`}
            width="100%"
            height="180"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Mapa — ${loc.title}`}
          />
        </div>
      )}
      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[var(--theme-primary)] underline underline-offset-2 flex items-center gap-1"
      >
        <MapPin size={12} /> Abrir no Google Maps
      </a>
    </div>
  );
}

function WeddingPartySection({ members }: { members: WeddingPartyMember[] }) {
  const groomSide = members.filter((m) => m.side === "GROOM");
  const brideSide = members.filter((m) => m.side === "BRIDE");

  const ROLE_LABELS: Record<string, string> = {
    BEST_MAN: "Padrinho de honra",
    MAID_OF_HONOR: "Madrinha de honra",
    GROOMSMAN: "Padrinho",
    BRIDESMAID: "Madrinha",
    FLOWER_GIRL: "Daminha",
    RING_BEARER: "Pajem",
    OTHER: "",
  };

  const renderGroup = (group: WeddingPartyMember[], title: string) =>
    group.length > 0 ? (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-[var(--theme-secondary)] uppercase tracking-wider font-medium">{title}</p>
        <div className="grid grid-cols-2 gap-3">
          {group.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1 text-center">
              <div className="w-14 h-14 rounded-full bg-[var(--theme-muted)] border border-[var(--theme-border)] flex items-center justify-center text-xl">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium leading-tight">{m.name}</p>
              {ROLE_LABELS[m.role] && (
                <p className="text-xs text-[var(--theme-secondary)]">{ROLE_LABELS[m.role]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6 mt-4">
      {renderGroup(groomSide, "Padrinhos")}
      {renderGroup(brideSide, "Madrinhas")}
    </div>
  );
}

// ─── Banners de estado do convidado ────────────────────────────────────────

function ConfirmedBanner({ name, slug, gamification }: { name: string; slug: string; gamification?: boolean }) {
  const firstName = name.split(" ")[0];
  return (
    <section className="rounded-[var(--theme-radius)] border border-green-200 bg-green-50 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle size={20} className="shrink-0" />
        <p className="font-medium">Olá, {firstName}! Presença confirmada ✓</p>
      </div>
      <div className="flex flex-col gap-2">
        <QuickLink href={`/${slug}/roteiro`} label="Ver roteiro do dia" />
        <QuickLink href={`/${slug}/locais`} label="Como chegar" />
        <QuickLink href={`/${slug}/presentes`} label="Lista de presentes" />
        {gamification && <QuickLink href={`/${slug}/gincana`} label="Gincana — ganhe pontos!" />}
      </div>
    </section>
  );
}

function DeclinedBanner({ slug, rsvpHref }: { slug: string; rsvpHref: string }) {
  return (
    <section className="rounded-[var(--theme-radius)] border border-[var(--theme-border)] bg-[var(--theme-muted)] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[var(--theme-secondary)]">
        <XCircle size={20} className="shrink-0" />
        <p className="font-medium">Sentiremos sua falta.</p>
      </div>
      <p className="text-sm text-[var(--theme-secondary)]">
        Mudou de ideia? Ainda dá tempo de confirmar presença.
      </p>
      <Link href={rsvpHref} className={buttonVariants({ className: "w-full h-12 text-base justify-center" })}>
        Confirmar presença agora
      </Link>
    </section>
  );
}

function RsvpCtaBanner({ slug, rsvpHref }: { slug: string; rsvpHref: string }) {
  return (
    <section className="flex flex-col gap-3">
      <Link href={rsvpHref} className={buttonVariants({ className: "w-full h-14 text-base font-semibold justify-center" })}>
        Confirmar presença
      </Link>
      <p className="text-xs text-center text-[var(--theme-secondary)]">
        Já confirmou antes?{" "}
        <Link href={`/${slug}/recuperar`} className="underline underline-offset-2">
          Recuperar acesso
        </Link>
      </p>
    </section>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-2 text-sm font-medium text-[var(--theme-primary)] hover:opacity-75 transition-opacity"
    >
      {label}
      <ChevronRight size={16} />
    </Link>
  );
}

function InvalidTokenScreen({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="text-4xl">🔒</p>
      <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
      <p className="text-sm text-[var(--theme-secondary)] max-w-xs">
        Use o link do seu convite ou{" "}
        <Link href={`/${slug}/recuperar`} className="underline underline-offset-2">
          recupere seu acesso pelo e-mail
        </Link>
        .
      </p>
    </div>
  );
}
