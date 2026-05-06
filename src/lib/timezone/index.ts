import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const DEFAULT_TZ = "America/Sao_Paulo";

export function formatEventDate(date: Date, timezone: string, fmt: string) {
  return formatInTimeZone(date, timezone, fmt, { locale: ptBR });
}

export function toEventTime(date: Date, timezone: string) {
  return toZonedTime(date, timezone);
}

export function formatTime(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "HH:mm", { locale: ptBR });
}

export function tzLabel(timezone: string) {
  const abbr: Record<string, string> = {
    "America/Sao_Paulo": "Brasília",
    "America/Manaus": "Manaus",
    "America/Belem": "Belém",
    "America/Fortaleza": "Fortaleza",
    "America/Noronha": "Noronha",
  };
  return abbr[timezone] ?? timezone;
}
