import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function detectLocale(): SupportedLocale {
  // 1. Cookie takes priority (user explicit choice)
  try {
    const cookieStore = cookies();
    // @ts-expect-error — cookies() may be sync or async depending on Next version
    const cookieLocale = (cookieStore instanceof Promise ? null : cookieStore.get("NEXT_LOCALE")?.value) as string | null | undefined;
    if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as SupportedLocale)) {
      return cookieLocale as SupportedLocale;
    }
  } catch { /* ignore */ }

  // 2. Accept-Language header
  try {
    const headerList = headers();
    // @ts-expect-error — headers() may be sync or async
    const acceptLang: string = headerList instanceof Promise ? "" : (headerList.get("accept-language") ?? "");
    if (acceptLang.toLowerCase().startsWith("en")) return "en";
  } catch { /* ignore */ }

  return "pt-BR";
}

export default getRequestConfig(async () => {
  const locale = detectLocale();
  const messageFile = locale === "en" ? "en" : "pt-BR";
  return {
    locale,
    messages: (await import(`@/messages/${messageFile}.json`)).default,
  };
});
