/**
 * Sanitizes a user-provided URL for use in href attributes.
 * Returns "#" for non-http(s) protocols (including javascript:, data:, vbscript:).
 */
export function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return "#";
    return url;
  } catch {
    return "#";
  }
}

/** Zod refinement: accepts only https:// and http:// URLs (rejects javascript:, data:, etc.) */
export function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
