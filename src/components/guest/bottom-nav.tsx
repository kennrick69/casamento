"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Calendar, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Início", icon: Home },
  { href: "/roteiro", label: "Roteiro", icon: Calendar },
  { href: "/local", label: "Local", icon: MapPin },
  { href: "/presentes", label: "Presentes", icon: Gift },
] as const;

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/${slug}`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-[var(--theme-background)] border-[var(--theme-border)]">
      <ul className="flex h-16 items-center">
        {TABS.map(({ href, label, icon: Icon }) => {
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
                  "flex flex-col items-center justify-center gap-1 py-2 min-h-[48px] w-full",
                  "text-xs font-medium transition-colors",
                  isActive
                    ? "text-[var(--theme-primary)]"
                    : "text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]"
                )}
              >
                <Icon
                  size={22}
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
