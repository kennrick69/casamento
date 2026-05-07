import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export interface AwardResult {
  awarded: boolean;
  points: number;
  reason?: string;
}

// Default missions seeded when an event is created
const DEFAULT_MISSIONS = [
  { code: "rsvp_confirmed", title: "Confirmou presença", points: 50, order: 1 },
  { code: "rsvp_early", title: "Confirmou antes do prazo", points: 30, order: 2 },
  { code: "photo_upload", title: "Enviou foto para o mural", points: 20, dailyCap: 3, order: 3 },
  { code: "chat_message", title: "Enviou mensagem no chat", points: 10, dailyCap: 5, order: 4 },
  { code: "playlist_add", title: "Sugeriu uma música", points: 15, dailyCap: 2, order: 5 },
  { code: "vote_cast", title: "Votou em uma música", points: 5, dailyCap: 5, order: 6 },
  { code: "checkin_venue", title: "Check-in no local do casamento", points: 100, order: 7 },
] as const;

export async function seedDefaultMissions(eventId: string): Promise<void> {
  const existing = await prisma.mission.count({ where: { eventId } });
  if (existing > 0) return;

  await prisma.mission.createMany({
    data: DEFAULT_MISSIONS.map((m) => ({
      eventId,
      code: m.code,
      title: m.title,
      points: m.points,
      dailyCap: "dailyCap" in m ? m.dailyCap : null,
      totalCap: null,
      active: true,
      order: m.order,
    })),
  });
}

export async function awardPoints(
  guestId: string,
  eventId: string,
  missionCode: string,
  metadata?: Record<string, string | number | boolean | null>
): Promise<AwardResult> {
  const mission = await prisma.mission.findUnique({
    where: { eventId_code: { eventId, code: missionCode } },
  });

  if (!mission || !mission.active) return { awarded: false, points: 0 };

  // Check daily cap
  if (mission.dailyCap !== null) {
    const now = new Date();
    const todayCount = await prisma.pointEvent.count({
      where: {
        guestId,
        eventId,
        missionId: mission.id,
        createdAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    });
    if (todayCount >= mission.dailyCap) {
      return { awarded: false, points: 0, reason: "daily_cap" };
    }
  }

  // Check total cap
  if (mission.totalCap !== null) {
    const totalCount = await prisma.pointEvent.count({
      where: { guestId, eventId, missionId: mission.id },
    });
    if (totalCount >= mission.totalCap) {
      return { awarded: false, points: 0, reason: "total_cap" };
    }
  }

  await prisma.$transaction([
    prisma.pointEvent.create({
      data: {
        guestId,
        eventId,
        missionId: mission.id,
        points: mission.points,
        reason: mission.title,
        metadata: (metadata ?? {}) as Record<string, string | number | boolean | null>,
      },
    }),
    prisma.guestPoints.upsert({
      where: { guestId },
      create: { guestId, eventId, totalPoints: mission.points },
      update: { totalPoints: { increment: mission.points }, lastUpdated: new Date() },
    }),
  ]);

  return { awarded: true, points: mission.points };
}
