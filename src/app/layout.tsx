import { getAppUrl } from "@/lib/app-url";
import type { Metadata, Viewport } from "next";
import {
  Inter,
  Cormorant_Garamond,
  Fraunces,
  Lora,
  Caveat,
  DM_Serif_Display,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Todas as fontes usadas pelos 5 temas — carregadas estaticamente para otimização
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap" });
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const APP_URL = getAppUrl();

export const metadata: Metadata = {
  title: { default: "Voem. — Convites interativos de casamento", template: "%s | Voem." },
  description: "Crie um convite interativo para o seu casamento. RSVP, mural de fotos, playlist colaborativa, lista de presentes e muito mais.",
  metadataBase: new URL(APP_URL),
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Voem." },
  openGraph: {
    siteName: "Voem.",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#9F1239",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={[
        inter.variable,
        cormorant.variable,
        fraunces.variable,
        lora.variable,
        caveat.variable,
        dmSerif.variable,
        "h-full antialiased",
      ].join(" ")}
    >
      <head>
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="dns-prefetch" href="https://api.spotify.com" />
        <link rel="dns-prefetch" href="https://socksv5.pusher.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
