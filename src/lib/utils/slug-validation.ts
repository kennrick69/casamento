// Slugs reservados — conflitam com rotas da aplicação ou são confusos
export const RESERVED_SLUGS = new Set([
  // Rotas do app
  "login", "admin", "api", "termos", "privacidade", "forgot-password",
  "reset-password", "verify-email", "verify", "aceitar-termos",
  "onboarding", "co-organizador",
  // Nomes técnicos comuns
  "www", "app", "mail", "email", "help", "support", "blog", "static",
  "_next", "favicon", "robots", "sitemap",
  // Palavras genéricas que causariam confusão
  "casamento", "wedding", "evento", "event",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/** Remove leading/trailing hyphens and collapses consecutive hyphens */
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
