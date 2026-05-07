"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

export function EventNav({ eventId }: { eventId: string }) {
  const base = `/admin/eventos/${eventId}`;
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: base, label: "Dashboard" },
    { href: `${base}/convidados`, label: "Convidados" },
    { href: `${base}/roteiro`, label: "Roteiro" },
    { href: `${base}/gincana`, label: "Gincana" },
    { href: `${base}/notificacoes`, label: "Notificações" },
    { href: `${base}/co-organizadores`, label: "Co-organizadores" },
    { href: `${base}/configuracoes`, label: "Configurações" },
  ];

  return (
    <nav className="flex gap-1 flex-wrap border-b border-border pb-3 mb-6">
      {items.map((item) => {
        const active =
          item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
