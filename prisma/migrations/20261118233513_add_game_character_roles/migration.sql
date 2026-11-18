-- CreateTable
CREATE TABLE "GameCharacter" (
    "id" TEXT NOT NULL,
    "guestId" TEXT,
    "companionId" TEXT,
    "skinColor" TEXT NOT NULL,
    "hairStyle" TEXT NOT NULL,
    "hairColor" TEXT NOT NULL,
    "outfit" TEXT NOT NULL,
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "lockedByRoleId" TEXT,
    "randomSeed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRole" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "uniformSpec" JSONB NOT NULL,
    "message" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestRoleClaim" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestRoleClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameCharacter_guestId_key" ON "GameCharacter"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "GameCharacter_companionId_key" ON "GameCharacter"("companionId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRole_eventId_key_key" ON "EventRole"("eventId", "key");

-- CreateIndex
CREATE INDEX "GuestRoleClaim_roleId_idx" ON "GuestRoleClaim"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestRoleClaim_guestId_roleId_key" ON "GuestRoleClaim"("guestId", "roleId");

-- AddForeignKey
ALTER TABLE "GameCharacter" ADD CONSTRAINT "GameCharacter_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameCharacter" ADD CONSTRAINT "GameCharacter_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "GuestCompanion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRole" ADD CONSTRAINT "EventRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRoleClaim" ADD CONSTRAINT "GuestRoleClaim_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRoleClaim" ADD CONSTRAINT "GuestRoleClaim_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "EventRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
