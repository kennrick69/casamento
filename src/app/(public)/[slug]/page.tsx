import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, ChevronRight, MapPin, Calendar } from "lucide-react";
import { validateEventAccess } from "@/lib/auth/guest";
import { formatEventDate } from "@/lib/timezone";
import { LandingHero } from "@/components/guest/landing-hero";
import { Countdown } from "@/components/guest/countdown";
import { buttonVariants } from "@/components/ui/button";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug };
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
    // Token inválido — mostra tela de link inválido
    return <InvalidTokenScreen slug={slug} />;
  }

  const { event, guest } = result;
  const paletteColors = event.paletteColors as Record<string, string> | null;

  return (
    <div className="flex flex-col min-h-screen">
      <LandingHero
        coupleNames={event.coupleNames}
        coverImageKey={event.coverImageKey}
        paletteColors={paletteColors}
      />

      <div className="flex flex-col gap-6 px-4 py-6">
        {/* Countdown */}
        <section className="text-center">
          <p className="text-sm text-[var(--theme-secondary)] mb-3 uppercase tracking-wider">
            {formatEventDate(event.ceremonyDate, event.timezone, "EEEE, d 'de' MMMM 'de' yyyy")}
          </p>
          <Countdown
            targetDate={event.ceremonyDate}
            timezone={event.timezone}
          />
        </section>

        {/* Estado do convidado */}
        {guest?.rsvpStatus === "CONFIRMED" && (
          <ConfirmedBanner
            name={guest.name}
            slug={slug}
            gamification={(event.features as Record<string, boolean>).gamification}
          />
        )}
        {guest?.rsvpStatus === "DECLINED" && (
          <DeclinedBanner slug={slug} k={k} />
        )}
        {(!guest || guest.rsvpStatus === "PENDING") && (
          <RsvpCtaBanner slug={slug} k={k} />
        )}

        {/* Info do evento */}
        <section className="flex flex-col gap-3">
          {event.ceremonyLocation && (
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--theme-secondary)]" />
              <div>
                <p className="font-medium text-sm">{event.ceremonyLocation}</p>
                {event.ceremonyAddress && (
                  <p className="text-xs text-[var(--theme-secondary)]">
                    {event.ceremonyAddress}
                  </p>
                )}
              </div>
            </div>
          )}
          {event.dresscode && (
            <div className="flex items-center gap-3">
              <Calendar size={18} className="shrink-0 text-[var(--theme-secondary)]" />
              <p className="text-sm">
                Traje: <span className="font-medium">{event.dresscode}</span>
              </p>
            </div>
          )}
          {event.description && (
            <p className="text-sm text-[var(--theme-secondary)] leading-relaxed">
              {event.description}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Sub-componentes de estado ─────────────────────────────────────────────

function ConfirmedBanner({ name, slug, gamification }: { name: string; slug: string; gamification?: boolean }) {
  const firstName = name.split(" ")[0];
  return (
    <section
      className="rounded-[var(--theme-radius)] border border-green-200 bg-green-50 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle size={20} className="shrink-0" />
        <p className="font-medium">
          Olá, {firstName}! Presença confirmada ✓
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <QuickLink href={`/${slug}/roteiro`} label="Ver roteiro do dia" />
        <QuickLink href={`/${slug}/local`} label="Como chegar" />
        <QuickLink href={`/${slug}/presentes`} label="Lista de presentes" />
        {gamification && <QuickLink href={`/${slug}/gincana`} label="Gincana — ganhe pontos!" />}
      </div>
    </section>
  );
}

function DeclinedBanner({ slug, k }: { slug: string; k?: string }) {
  const rsvpHref = `/${slug}/rsvp${k ? `?k=${k}` : ""}`;
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

function RsvpCtaBanner({ slug, k }: { slug: string; k?: string }) {
  const rsvpHref = `/${slug}/rsvp${k ? `?k=${k}` : ""}`;
  return (
    <section className="flex flex-col gap-3">
      <Link href={rsvpHref} className={buttonVariants({ className: "w-full h-14 text-base font-semibold justify-center" })}>
        Confirmar presença
      </Link>
      <p className="text-xs text-center text-[var(--theme-secondary)]">
        Já confirmou antes?{" "}
        <Link
          href={`/${slug}/recuperar`}
          className="underline underline-offset-2"
        >
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
