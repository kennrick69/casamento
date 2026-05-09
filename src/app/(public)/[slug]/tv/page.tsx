import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TvClient } from "./tv-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TvPage({ params }: Props) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug, status: "PUBLISHED", archivedAt: null },
    select: {
      id: true,
      coupleNames: true,
      ceremonyDate: true,
      photos: {
        where: { approvedByCouple: true, removedAt: null, visibility: "PUBLIC" },
        select: { id: true, storageKey: true, caption: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      chatMessages: {
        where: { removedAt: null },
        select: { id: true, content: true, guest: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      liveEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, type: true, title: true, body: true, createdAt: true },
      },
      journeyItems: {
        orderBy: { order: "asc" },
        select: { id: true, time: true, title: true, description: true },
      },
    },
  });

  if (!event) notFound();

  const slides = buildSlides(event);

  return (
    <TvClient
      eventId={event.id}
      coupleNames={event.coupleNames}
      slides={slides}
      latestLive={event.liveEvents[0] ?? null}
    />
  );
}

// ─── Slide builder ─────────────────────────────────────────────────────────

type SlideType = "photo" | "message" | "schedule" | "live";

export interface Slide {
  type: SlideType;
  id: string;
  photoUrl?: string;
  caption?: string;
  content?: string;
  author?: string;
  scheduleItems?: { time: string | null; title: string }[];
  liveTitle?: string;
  liveBody?: string;
}

function buildSlides(event: {
  photos: { id: string; storageKey: string; caption: string | null }[];
  chatMessages: { id: string; content: string; guest: { name: string } }[];
  journeyItems: { id: string; time: string | null; title: string }[];
}) {
  const slides: Slide[] = [];

  for (const p of event.photos) {
    slides.push({
      type: "photo",
      id: `photo-${p.id}`,
      photoUrl: `/api/photos/${encodeURIComponent(p.storageKey)}`,
      caption: p.caption ?? undefined,
    });
  }

  for (const m of event.chatMessages) {
    slides.push({
      type: "message",
      id: `msg-${m.id}`,
      content: m.content,
      author: m.guest.name,
    });
  }

  if (event.journeyItems.length > 0) {
    slides.push({
      type: "schedule",
      id: "schedule",
      scheduleItems: event.journeyItems.map((j) => ({
        time: j.time,
        title: j.title,
      })),
    });
  }

  return shuffle(slides);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
