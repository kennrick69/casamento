import { getAppUrl } from "@/lib/app-url";
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const APP_URL = getAppUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${APP_URL}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/termos`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/privacidade`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = events.flatMap((e) => [
    { url: `${APP_URL}/${e.slug}`, lastModified: e.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${APP_URL}/${e.slug}/rsvp`, lastModified: e.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${APP_URL}/${e.slug}/historia`, lastModified: e.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${APP_URL}/${e.slug}/galeria`, lastModified: e.updatedAt, changeFrequency: "daily" as const, priority: 0.5 },
  ]);

  return [...staticRoutes, ...eventRoutes];
}
