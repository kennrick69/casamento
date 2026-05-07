import disposableDomains from "disposable-email-domains";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321

export type EmailValidationResult =
  | { ok: true }
  | { ok: false; reason: "format" | "disposable" | "too_long" };

export function validateEmail(email: string): EmailValidationResult {
  if (email.length > MAX_EMAIL_LENGTH) return { ok: false, reason: "too_long" };
  if (!EMAIL_REGEX.test(email)) return { ok: false, reason: "format" };

  const domain = email.split("@")[1].toLowerCase();
  if ((disposableDomains as string[]).includes(domain)) {
    return { ok: false, reason: "disposable" };
  }

  return { ok: true };
}
