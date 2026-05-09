import { getAppUrl } from "@/lib/app-url";
import type { MetadataRoute } from "next";

const APP_URL = getAppUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/verify-email", "/aceitar-termos"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
