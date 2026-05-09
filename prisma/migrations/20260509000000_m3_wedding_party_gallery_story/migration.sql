-- M3: GalleryPhoto, WeddingPartyMember, CoupleStoryItem, Guest.inviteToken

ALTER TABLE "Guest" ADD COLUMN "inviteToken" TEXT;
CREATE UNIQUE INDEX "Guest_inviteToken_key" ON "Guest"("inviteToken");

CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GalleryPhoto_eventId_order_idx" ON "GalleryPhoto"("eventId", "order");
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "WeddingRole" AS ENUM ('BEST_MAN','MAID_OF_HONOR','GROOMSMAN','BRIDESMAID','FLOWER_GIRL','RING_BEARER','OTHER');
CREATE TYPE "WeddingSide" AS ENUM ('BRIDE','GROOM');

CREATE TABLE "WeddingPartyMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "WeddingRole" NOT NULL DEFAULT 'GROOMSMAN',
    "bio" TEXT,
    "photoKey" TEXT,
    "side" "WeddingSide" NOT NULL DEFAULT 'GROOM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeddingPartyMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeddingPartyMember_eventId_side_order_idx" ON "WeddingPartyMember"("eventId", "side", "order");
ALTER TABLE "WeddingPartyMember" ADD CONSTRAINT "WeddingPartyMember_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CoupleStoryItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "dateLabel" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "photoKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoupleStoryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoupleStoryItem_eventId_order_idx" ON "CoupleStoryItem"("eventId", "order");
ALTER TABLE "CoupleStoryItem" ADD CONSTRAINT "CoupleStoryItem_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
