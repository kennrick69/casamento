-- CreateEnum
CREATE TYPE "InviteCodeKind" AS ENUM ('PERSONAL', 'BLANK');

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "InviteCodeKind" NOT NULL DEFAULT 'PERSONAL',
    "guestId" TEXT,
    "maxCompanions" INTEGER NOT NULL DEFAULT 4,
    "batchLabel" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentChannel" TEXT,
    "claimedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InviteCode_eventId_kind_idx" ON "InviteCode"("eventId", "kind");

-- CreateIndex
CREATE INDEX "InviteCode_guestId_idx" ON "InviteCode"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_eventId_code_key" ON "InviteCode"("eventId", "code");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
