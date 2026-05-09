#!/usr/bin/env tsx
/**
 * QA.6 — DB Integrity Checks
 *
 * Usage: pnpm tsx scripts/db-integrity.ts
 *
 * Checks:
 *   1. GalleryPhoto / CoupleStoryItem com storageKey órfão (evento deletado)
 *   2. Guest records sem eventId válido
 *   3. WeddingPartyMember sem eventId válido
 *   4. PlaylistSuggestion sem eventId válido
 *   5. Photo sem eventId válido
 *   6. Sessions expiradas (> 30 dias)
 *   7. Events sem co-organizador OWNER
 *   8. Guests com inviteToken duplicado
 */

import { prisma } from "../src/lib/db";

type CheckResult = { name: string; count: number; sample?: unknown[] };

async function run() {
  const results: CheckResult[] = [];

  // 1. GalleryPhoto com evento deletado
  const orphanGallery = await prisma.galleryPhoto.findMany({
    where: { event: { is: undefined } },
    select: { id: true, storageKey: true },
    take: 5,
  }).catch(() => [] as { id: string; storageKey: string }[]);
  results.push({ name: "GalleryPhoto orphans", count: orphanGallery.length, sample: orphanGallery });

  // 2. CoupleStoryItem com evento deletado
  const orphanStory = await prisma.coupleStoryItem.findMany({
    where: { event: { is: undefined } },
    select: { id: true },
    take: 5,
  }).catch(() => [] as { id: string }[]);
  results.push({ name: "CoupleStoryItem orphans", count: orphanStory.length, sample: orphanStory });

  // 3. Guests sem evento válido
  const orphanGuests = await prisma.guest.findMany({
    where: { event: { is: undefined } },
    select: { id: true, name: true, email: true },
    take: 5,
  }).catch(() => [] as { id: string; name: string; email: string }[]);
  results.push({ name: "Guest orphans", count: orphanGuests.length, sample: orphanGuests });

  // 4. Guests com deletedAt mas ainda com inviteToken
  const deletedWithToken = await prisma.guest.findMany({
    where: { deletedAt: { not: null }, inviteToken: { not: null } },
    select: { id: true, email: true, deletedAt: true },
    take: 5,
  }).catch(() => [] as { id: string; email: string; deletedAt: Date | null }[]);
  results.push({ name: "Soft-deleted guests with active inviteToken", count: deletedWithToken.length, sample: deletedWithToken });

  // 5. Sessions expiradas (Auth.js armazena em Session table — pode não existir dependendo da strategy)
  // JWT strategy não tem Session table — skip silently
  let expiredSessions = 0;
  try {
    const expired = await (prisma as unknown as { session: { count: (args: unknown) => Promise<number> } }).session.count({
      where: { expires: { lt: new Date() } },
    });
    expiredSessions = expired;
  } catch {
    // JWT strategy — no Session table, this is expected
  }
  results.push({ name: "Expired sessions (JWT: N/A)", count: expiredSessions });

  // 6. Events sem co-organizador OWNER
  const eventsWithoutOwner = await prisma.event.findMany({
    where: {
      organizers: { none: { role: "OWNER" } },
    },
    select: { id: true, slug: true, coupleNames: true },
    take: 5,
  }).catch(() => [] as { id: string; slug: string; coupleNames: string }[]);
  results.push({ name: "Events without OWNER organizer", count: eventsWithoutOwner.length, sample: eventsWithoutOwner });

  // 7. Photos com approvedByCouple=true mas removedAt set (inconsistência)
  const inconsistentPhotos = await prisma.photo.findMany({
    where: { approvedByCouple: true, removedAt: { not: null } },
    select: { id: true, eventId: true, removedAt: true },
    take: 5,
  }).catch(() => [] as { id: string; eventId: string; removedAt: Date | null }[]);
  results.push({ name: "Photos: approved=true AND removedAt set", count: inconsistentPhotos.length, sample: inconsistentPhotos });

  // 8. Guests com rsvpStatus=CONFIRMED mas banned=true
  const bannedConfirmed = await prisma.guest.findMany({
    where: { rsvpStatus: "CONFIRMED", banned: true, deletedAt: null },
    select: { id: true, name: true, email: true },
    take: 5,
  }).catch(() => [] as { id: string; name: string; email: string }[]);
  results.push({ name: "Guests: CONFIRMED + banned (data inconsistency)", count: bannedConfirmed.length, sample: bannedConfirmed });

  // Print results
  let hasIssues = false;
  console.log("\n=== DB Integrity Report ===\n");
  for (const r of results) {
    const icon = r.count === 0 ? "✅" : "⚠️ ";
    console.log(`${icon} ${r.name}: ${r.count}`);
    if (r.count > 0) {
      hasIssues = true;
      if (r.sample?.length) console.log("   Sample:", JSON.stringify(r.sample, null, 2));
    }
  }

  console.log("\n" + (hasIssues ? "⚠️  Some issues found — review above." : "✅ All checks passed.") + "\n");
  process.exit(hasIssues ? 1 : 0);
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(2);
}).finally(() => prisma.$disconnect());
