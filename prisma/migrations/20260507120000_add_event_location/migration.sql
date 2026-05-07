-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CEREMONY', 'RECEPTION', 'TEA_PARTY', 'BACHELOR_PARTY', 'BRUNCH', 'REHEARSAL', 'OTHER');

-- CreateTable
CREATE TABLE "EventLocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "date" TIMESTAMP(3),
    "timeLabel" TEXT,
    "dresscode" TEXT,
    "description" TEXT,
    "coverImageKey" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventLocation_eventId_order_idx" ON "EventLocation"("eventId", "order");

-- CreateIndex
CREATE INDEX "EventLocation_eventId_type_isMain_idx" ON "EventLocation"("eventId", "type", "isMain");

-- AddForeignKey
ALTER TABLE "EventLocation" ADD CONSTRAINT "EventLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing ceremony locations from flat Event fields
INSERT INTO "EventLocation" ("id", "eventId", "type", "title", "address", "isMain", "order", "isPublic", "createdAt")
SELECT
    gen_random_uuid()::text,
    e."id",
    'CEREMONY'::"LocationType",
    COALESCE(NULLIF(TRIM(e."ceremonyLocation"), ''), 'Cerimônia'),
    NULLIF(TRIM(COALESCE(e."ceremonyAddress", '')), ''),
    true,
    0,
    true,
    NOW()
FROM "Event" e
WHERE NULLIF(TRIM(COALESCE(e."ceremonyLocation", '')), '') IS NOT NULL
   OR NULLIF(TRIM(COALESCE(e."ceremonyAddress", '')), '') IS NOT NULL;

-- Migrate existing reception locations (only when different from ceremony)
INSERT INTO "EventLocation" ("id", "eventId", "type", "title", "address", "isMain", "order", "isPublic", "createdAt")
SELECT
    gen_random_uuid()::text,
    e."id",
    'RECEPTION'::"LocationType",
    COALESCE(NULLIF(TRIM(e."receptionLocation"), ''), 'Recepção'),
    NULLIF(TRIM(COALESCE(e."receptionAddress", '')), ''),
    true,
    1,
    true,
    NOW()
FROM "Event" e
WHERE NULLIF(TRIM(COALESCE(e."receptionLocation", '')), '') IS NOT NULL
  AND (
    NULLIF(TRIM(COALESCE(e."receptionLocation", '')), '') IS DISTINCT FROM NULLIF(TRIM(COALESCE(e."ceremonyLocation", '')), '')
    OR NULLIF(TRIM(COALESCE(e."receptionAddress", '')), '') IS DISTINCT FROM NULLIF(TRIM(COALESCE(e."ceremonyAddress", '')), '')
  );
