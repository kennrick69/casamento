import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { OrganizerRole } from "@prisma/client";

export async function requireOrganizer(eventId: string, role?: OrganizerRole) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const organizer = await prisma.eventOrganizer.findUnique({
    where: { eventId_userId: { eventId, userId: session.user.id } },
  });

  if (!organizer) throw new Error("UNAUTHORIZED");
  if (role && organizer.role !== role) throw new Error("FORBIDDEN");

  return { userId: session.user.id, role: organizer.role };
}

export async function requireOwner(eventId: string) {
  return requireOrganizer(eventId, "OWNER");
}

export async function getOrganizerEvents(userId: string) {
  return prisma.eventOrganizer.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { event: { createdAt: "desc" } },
  });
}
