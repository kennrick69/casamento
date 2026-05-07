"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, MessageCircle, Music, Gift, Map, MapPin } from "lucide-react";
import { toZonedTime } from "date-fns-tz";
import { startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const TABS_PRE_DDAY: Tab[] = [
  { href: "", label: "Início", icon: Home },
  { href: "/roteiro", label: "Roteiro", icon: Map },
  { href: "/local", label: "Local", icon: MapPin },
  { href: "/presentes", label: "Presentes", icon: Gift },
];

const TABS_DDAY_PLUS: Tab[] = [
  { href: "", label: "Início", icon: Home },
  { href: "/mural", label: "Fotos", icon: Camera },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/playlist", label: "Playlist", icon: Music },
  { href: "/presentes", label: "Presentes", icon: Gift },
];

// Exported so it can be unit-tested independently.
export function getActiveBottomNav(ceremonyDateIso: string, timezone: string): Tab[] {
  const now = new Date();
  const todayInTz = startOfDay(toZonedTime(now, timezone));
  const ceremonyInTz = startOfDay(toZonedTime(new Date(ceremonyDateIso), timezone));
  return todayInTz >= ceremonyInTz ? TABS_DDAY_PLUS : TABS_PRE_DDAY;
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
  const tabs = getActiveBottomNav(ceremonyDate, timezone);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-[var(--theme-background)] border-[var(--theme-border)]">
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
