-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "characterClaimedAt" TIMESTAMP(3),
ADD COLUMN     "isVisitor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playerName" TEXT;

-- CreateTable
CREATE TABLE "GuestCredential" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "GuestCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestCredential_credentialId_key" ON "GuestCredential"("credentialId");

-- CreateIndex
CREATE INDEX "GuestCredential_guestId_idx" ON "GuestCredential"("guestId");

-- AddForeignKey
ALTER TABLE "GuestCredential" ADD CONSTRAINT "GuestCredential_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
