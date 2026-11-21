"use client";

import { usePathname } from "next/navigation";

// Esconde a chrome do site do convidado (seletor de idioma, barra de
// acessibilidade, navegação inferior) dentro da experiência imersiva do Modo
// Gamificado (/<slug>/jogo e subrotas), que ocupa a tela inteira. No restante
// do site a chrome aparece normalmente. Evita, por ex., o "EN" sobrepor o HUD
// do jogo (feedback do JOs, item 16).
export function HideOnGame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && /\/jogo(\/|$)/.test(pathname)) return null;
  return <>{children}</>;
}
