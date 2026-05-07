import { prisma } from "@/lib/db";
import type { LocationType } from "@prisma/client";

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  CEREMONY: "Cerimônia",
  RECEPTION: "Recepção",
  TEA_PARTY: "Chá de panela",
  BACHELOR_PARTY: "Despedida de solteiro/a",
  BRUNCH: "Brunch pós-casamento",
  REHEARSAL: "Ensaio",
  OTHER: "Outro",
};

export const LOCATION_TYPE_ICONS: Record<LocationType, string> = {
  CEREMONY: "💒",
  RECEPTION: "🎉",
  TEA_PARTY: "🫖",
  BACHELOR_PARTY: "🥂",
  BRUNCH: "☕",
  REHEARSAL: "📋",
  OTHER: "📍",
};

export function generateMapsLink(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

export function generateWazeLink(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`;
}

// Compat helper: retorna o local principal de um tipo para emails e páginas legadas.
export async function getMainLocation(eventId: string, type: LocationType) {
  return prisma.eventLocation.findFirst({
    where: { eventId, type, isMain: true, isPublic: true },
  });
}
