import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withBundleAnalyzerFactory from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/index.ts");
const withBundleAnalyzer = withBundleAnalyzerFactory({ enabled: process.env.ANALYZE === "true" });

// CSP directive sources
const CSP_DIRECTIVES = [
  // Default fallback
  "default-src 'self'",
  // Scripts: own bundle + Next.js inline hydration + Cloudflare Turnstile
  // 'unsafe-inline' is required for Next.js App Router inline <script> hydration payloads.
  // Upgrade to nonce-based CSP when Middleware nonce support is stable.
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  // Styles: own bundle + Next.js critical CSS injection
  "style-src 'self' 'unsafe-inline'",
  // Fonts: next/font/google self-hosts all fonts as static assets under /_next/static/
  "font-src 'self'",
  // Images: own API proxy + inline data URIs + blob for upload previews + Spotify album art
  "img-src 'self' data: blob: https://i.scdn.co https://mosaic.scdn.co https://images-ak.spotifycdn.com",
  // Connections: own API + Pusher WebSocket (all clusters) + Turnstile + Spotify API + Sentry ingest
  "connect-src 'self' wss://*.pusher.com https://*.pusher.com https://challenges.cloudflare.com https://api.spotify.com https://accounts.spotify.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  // Frames: Turnstile renders its challenge inside an iframe; Google Maps
  // embed na seção de locais da landing pública.
  "frame-src https://challenges.cloudflare.com https://maps.google.com https://www.google.com",
  // Block plugins and dynamic base URL overrides
  "object-src 'none'",
  "base-uri 'self'",
  // Only allow form submissions to own origin
  "form-action 'self'",
  // Upgrade any accidental http:// sub-resource requests
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value: CSP_DIRECTIVES,
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "images-ak.spotifycdn.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

const config = withBundleAnalyzer(withNextIntl(nextConfig));

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  // Only upload source maps when DSN is configured
  sourcemaps: { disable: !process.env.SENTRY_DSN },
  // Disable Sentry telemetry about our build
  telemetry: false,
});
