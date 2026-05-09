"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, MessageCircle, Music, Gift, Map, MapPin } from "lucide-react";
import { toZonedTime } from "date-fns-tz";
import { startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Tab = {
  href: string;
  label: string;
  icon: React.ElementType;
};

// Exported so it can be unit-tested independently.
// Returns fixed pt-BR labels — the BottomNav component overrides with i18n at render time.
export function getActiveBottomNav(ceremonyDateIso: string, timezone: string): { href: string; label: string; icon: React.ElementType }[] {
  const now = new Date();
  const todayInTz = startOfDay(toZonedTime(now, timezone));
  const ceremonyInTz = startOfDay(toZonedTime(new Date(ceremonyDateIso), timezone));
  const isDDay = todayInTz >= ceremonyInTz;
  return isDDay
    ? [
        { href: "", label: "Início", icon: Home },
        { href: "/mural", label: "Fotos", icon: Camera },
        { href: "/chat", label: "Chat", icon: MessageCircle },
        { href: "/playlist", label: "Playlist", icon: Music },
        { href: "/presentes", label: "Presentes", icon: Gift },
      ]
    : [
        { href: "", label: "Início", icon: Home },
        { href: "/roteiro", label: "Roteiro", icon: Map },
        { href: "/locais", label: "Locais", icon: MapPin },
        { href: "/presentes", label: "Presentes", icon: Gift },
      ];
}

export function BottomNav({
  slug,
  ceremonyDate,
  timezone,
}: {
  slug: string;
  ceremonyDate: string;
  timezone: string;
}) {
  const pathname = usePathname();
  const base = `/${slug}`;
  const t = useTranslations("nav");
  const isDDay = (() => {
    const now = new Date();
    const todayInTz = startOfDay(toZonedTime(now, timezone));
    const ceremonyInTz = startOfDay(toZonedTime(new Date(ceremonyDate), timezone));
    return todayInTz >= ceremonyInTz;
  })();
  const tabs: Tab[] = isDDay
    ? [
        { href: "", label: t("home"), icon: Home },
        { href: "/mural", label: t("mural"), icon: Camera },
        { href: "/chat", label: t("chat"), icon: MessageCircle },
        { href: "/playlist", label: t("playlist"), icon: Music },
        { href: "/presentes", label: t("presentes"), icon: Gift },
      ]
    : [
        { href: "", label: t("home"), icon: Home },
        { href: "/roteiro", label: t("roteiro"), icon: Map },
        { href: "/locais", label: t("local"), icon: MapPin },
        { href: "/presentes", label: t("presentes"), icon: Gift },
      ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-[var(--theme-background)] border-[var(--theme-border)]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <ul className="flex h-16 items-center">
        {tabs.map(({ href, label, icon: Icon }) => {
          const fullHref = `${base}${href}`;
          const isActive =
            href === ""
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(fullHref);

          return (
            <li key={href} className="flex-1">
              <Link
                href={fullHref}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] w-full",
                  "text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-[var(--theme-primary)]"
                    : "text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]"
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
