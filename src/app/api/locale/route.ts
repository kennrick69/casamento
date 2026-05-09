import { NextRequest, NextResponse } from "next/server";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/index";

export async function POST(req: NextRequest) {
  const { locale } = await req.json().catch(() => ({})) as { locale?: string };
  if (!locale || !SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    return NextResponse.json({ error: "Locale inválido" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
