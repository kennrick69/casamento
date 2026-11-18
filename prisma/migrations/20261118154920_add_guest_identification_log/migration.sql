-- CreateTable
CREATE TABLE "GuestIdentificationLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestIdentificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestIdentificationLog_eventId_createdAt_idx" ON "GuestIdentificationLog"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestIdentificationLog_guestId_createdAt_idx" ON "GuestIdentificationLog"("guestId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuestIdentificationLog" ADD CONSTRAINT "GuestIdentificationLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestIdentificationLog" ADD CONSTRAINT "GuestIdentificationLog_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
