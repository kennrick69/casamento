"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();

  async function toggle() {
    const next = locale === "pt-BR" ? "en" : "pt-BR";
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className="text-xs font-medium px-2 py-1 rounded-full border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:bg-[var(--theme-muted)] transition-colors min-h-[36px]"
      aria-label={locale === "pt-BR" ? "Switch to English" : "Mudar para Português"}
    >
      {locale === "pt-BR" ? "EN" : "PT"}
    </button>
  );
}
