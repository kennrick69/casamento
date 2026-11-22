-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,
    "guestId" TEXT,
    "companionId" TEXT,
    "claimedById" TEXT,
    "holderName" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'guest',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Seat_eventId_idx" ON "Seat"("eventId");

-- CreateIndex
CREATE INDEX "Seat_tableId_idx" ON "Seat"("tableId");

-- CreateIndex
CREATE INDEX "Seat_claimedById_idx" ON "Seat"("claimedById");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_tableId_seatIndex_key" ON "Seat"("tableId", "seatIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_guestId_key" ON "Seat"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_companionId_key" ON "Seat"("companionId");

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SeatingTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "GuestCompanion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
