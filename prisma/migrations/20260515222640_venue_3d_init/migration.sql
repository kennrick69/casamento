-- CreateEnum
CREATE TYPE "Venue3DObjectKind" AS ENUM ('TABLE_ROUND_6', 'TABLE_ROUND_8', 'TABLE_ROUND_10', 'TABLE_ROUND_12', 'TABLE_RECT_4', 'TABLE_RECT_6', 'TABLE_IMPERIAL_16', 'TABLE_U', 'TABLE_C', 'TABLE_T', 'BUFFET', 'CAKE_TABLE', 'STAGE', 'DJ_BOOTH', 'DANCE_FLOOR', 'BAR', 'PLANT', 'CHANDELIER', 'RUG', 'FLOWER_ARCH');

-- CreateEnum
CREATE TYPE "AvatarSource" AS ENUM ('PHOTO_AI', 'MANUAL');

-- CreateTable
CREATE TABLE "Venue3D" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "floorWidthTiles" INTEGER NOT NULL DEFAULT 20,
    "floorDepthTiles" INTEGER NOT NULL DEFAULT 20,
    "floorColor" TEXT NOT NULL DEFAULT '#F5F0E8',
    "wallColor" TEXT NOT NULL DEFAULT '#E8E0D0',
    "ambientLight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue3D_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue3DObject" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "kind" "Venue3DObjectKind" NOT NULL,
    "voxModelKey" TEXT,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "number" INTEGER,
    "label" TEXT,
    "seats" INTEGER,
    "guests" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue3DObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue3DAvatar" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "source" "AvatarSource" NOT NULL DEFAULT 'MANUAL',
    "skinTone" TEXT NOT NULL DEFAULT '#FDBCB4',
    "hairColor" TEXT NOT NULL DEFAULT '#3B2314',
    "hairStyle" TEXT NOT NULL DEFAULT 'short',
    "shirtColor" TEXT NOT NULL DEFAULT '#4A90D9',
    "pantsColor" TEXT NOT NULL DEFAULT '#2C3E50',
    "hasGlasses" BOOLEAN NOT NULL DEFAULT false,
    "hasBeard" BOOLEAN NOT NULL DEFAULT false,
    "assignedSeatIndex" INTEGER,
    "assignedObjectId" TEXT,
    "currentX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "facing" TEXT NOT NULL DEFAULT 'south',
    "isWalking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue3DAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue3D_eventId_key" ON "Venue3D"("eventId");

-- CreateIndex
CREATE INDEX "Venue3DObject_venueId_idx" ON "Venue3DObject"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue3DAvatar_guestId_key" ON "Venue3DAvatar"("guestId");

-- CreateIndex
CREATE INDEX "Venue3DAvatar_venueId_idx" ON "Venue3DAvatar"("venueId");

-- AddForeignKey
ALTER TABLE "Venue3D" ADD CONSTRAINT "Venue3D_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue3DObject" ADD CONSTRAINT "Venue3DObject_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue3DAvatar" ADD CONSTRAINT "Venue3DAvatar_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue3DAvatar" ADD CONSTRAINT "Venue3DAvatar_assignedObjectId_fkey" FOREIGN KEY ("assignedObjectId") REFERENCES "Venue3DObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
