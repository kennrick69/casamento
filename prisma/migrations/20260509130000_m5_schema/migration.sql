-- M5 schema additions

-- M5.1: Event customization JSON
ALTER TABLE "Event" ADD COLUMN "customization" JSONB;

-- M5.2: Seating tables
CREATE TABLE "SeatingTable" (
  "id"        TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "capacity"  INTEGER NOT NULL DEFAULT 8,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeatingTable_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SeatingTable" ADD CONSTRAINT "SeatingTable_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "SeatingTable_eventId_order_idx" ON "SeatingTable"("eventId", "order");

CREATE TABLE "SeatingAssignment" (
  "id"      TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  CONSTRAINT "SeatingAssignment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SeatingAssignment" ADD CONSTRAINT "SeatingAssignment_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "SeatingTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "SeatingAssignment_guestId_key" ON "SeatingAssignment"("guestId");
CREATE INDEX "SeatingAssignment_tableId_idx" ON "SeatingAssignment"("tableId");

-- M5.4: Live events
CREATE TABLE "LiveEvent" (
  "id"        TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  "userId"    TEXT,
  "type"      TEXT NOT NULL DEFAULT 'update',
  "title"     TEXT NOT NULL,
  "body"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "LiveEvent_eventId_createdAt_idx" ON "LiveEvent"("eventId", "createdAt");

-- M5.5: Guest profile fields
ALTER TABLE "Guest" ADD COLUMN "profileBio"          TEXT;
ALTER TABLE "Guest" ADD COLUMN "profileRelationship" TEXT;
ALTER TABLE "Guest" ADD COLUMN "profileImageKey"     TEXT;
ALTER TABLE "Guest" ADD COLUMN "profilePublic"       BOOLEAN NOT NULL DEFAULT false;

-- M5.6: Thank-you tracking
ALTER TABLE "Guest" ADD COLUMN "giftReceived"  TEXT;
ALTER TABLE "Guest" ADD COLUMN "thankYouNote"  TEXT;
ALTER TABLE "Guest" ADD COLUMN "thankYouSent"  BOOLEAN NOT NULL DEFAULT false;

-- M5.7: Digest frequency on organizer
CREATE TYPE "DigestFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY');
ALTER TABLE "EventOrganizer" ADD COLUMN "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'NONE';
