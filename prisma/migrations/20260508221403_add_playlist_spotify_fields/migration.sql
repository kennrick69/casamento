-- CreateEnum
CREATE TYPE "PlaylistSongStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PLAYED');

-- AlterTable
ALTER TABLE "PlaylistSuggestion" ADD COLUMN     "albumArtUrl" TEXT,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "songStatus" "PlaylistSongStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "spotifyTrackId" TEXT;

-- CreateIndex
CREATE INDEX "PlaylistSuggestion_eventId_songStatus_idx" ON "PlaylistSuggestion"("eventId", "songStatus");
