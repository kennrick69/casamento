import "server-only";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { formatEventDate } from "@/lib/timezone";
import { generateMapsLink } from "@/lib/locations";
import { firstName } from "@/lib/game/identity";
import { formatCode } from "./codes";
import type { InviteContext } from "./message";

export type InviteEventData = {
  id: string;
  slug: string;
  coupleNames: string;
  ceremonyDate: Date;
  timezone: string;
  ceremonyLocation: string | null;
  ceremonyAddress: string | null;
  mapsLink: string | null;
};

// Parte do contexto que NÃO depende do convidado — resolvida UMA vez e
// reaproveitada para todos (evita N queries de local numa lista grande).
export type InviteBase = {
  coupleNames: string;
  dateLabel: string;
  timeLabel: string | null;
  locationLine: string | null;
  mapsLink: string | null;
  siteUrl: string;
  slug: string;
  appUrl: string;
};

// Resolve o melhor "local + rota": o EventLocation principal (ou de cerimônia)
// com endereço, senão os campos legados do próprio evento.
async function resolveLocation(event: InviteEventData): Promise<{ line: string | null; maps: string | null }> {
  const loc = await prisma.eventLocation.findFirst({
    where: { eventId: event.id, isPublic: true, address: { not: null } },
    orderBy: [{ isMain: "desc" }, { order: "asc" }],
    select: { title: true, address: true },
  });
  if (loc?.address) {
    const line = loc.title ? `${loc.title} — ${loc.address}` : loc.address;
    return { line, maps: generateMapsLink(loc.address) };
  }
  const addr = event.ceremonyAddress ?? null;
  const name = event.ceremonyLocation ?? null;
  const line = name && addr ? `${name} — ${addr}` : name ?? addr;
  const maps = addr ? generateMapsLink(addr) : event.mapsLink ?? null;
  return { line, maps };
}

export async function getInviteBase(event: InviteEventData): Promise<InviteBase> {
  const appUrl = getAppUrl();
  const { line, maps } = await resolveLocation(event);
  return {
    coupleNames: event.coupleNames,
    dateLabel: formatEventDate(event.ceremonyDate, event.timezone, "EEEE, d 'de' MMMM 'de' yyyy"),
    timeLabel: formatEventDate(event.ceremonyDate, event.timezone, "HH'h'mm"),
    locationLine: line,
    mapsLink: maps,
    siteUrl: `${appUrl}/${event.slug}`,
    slug: event.slug,
    appUrl,
  };
}

// Junta a base (reutilizável) com o convidado + código — puro.
export function assembleInviteContext(base: InviteBase, guestName: string, code: string): InviteContext {
  return {
    firstName: firstName(guestName) || "você",
    coupleNames: base.coupleNames,
    dateLabel: base.dateLabel,
    timeLabel: base.timeLabel,
    locationLine: base.locationLine,
    mapsLink: base.mapsLink,
    siteUrl: base.siteUrl,
    personalLink: `${base.appUrl}/${base.slug}/c/${code}`,
    code: formatCode(code),
  };
}

// Conveniência p/ um convidado só (ex.: ação de e-mail).
export async function buildInviteContext(
  event: InviteEventData,
  guestName: string,
  code: string
): Promise<InviteContext> {
  const base = await getInviteBase(event);
  return assembleInviteContext(base, guestName, code);
}
