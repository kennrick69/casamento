import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/index.ts");

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
  // Images: own API proxy + inline data URIs + blob for upload previews
  "img-src 'self' data: blob:",
  // Connections: own API + Pusher WebSocket (all clusters) + Turnstile verification
  "connect-src 'self' wss://*.pusher.com https://*.pusher.com https://challenges.cloudflare.com",
  // Frames: Turnstile renders its challenge inside an iframe
  "frame-src https://challenges.cloudflare.com",
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
