-- CreateEnum
CREATE TYPE "CompanionType" AS ENUM ('ADULT', 'CHILD');

-- CreateTable
CREATE TABLE "GuestCompanion" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompanionType" NOT NULL DEFAULT 'ADULT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestCompanion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestCompanion_guestId_idx" ON "GuestCompanion"("guestId");

-- AddForeignKey
ALTER TABLE "GuestCompanion" ADD CONSTRAINT "GuestCompanion_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
