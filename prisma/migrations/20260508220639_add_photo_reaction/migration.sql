-- CreateTable
CREATE TABLE "PhotoReaction" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "guestId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoReaction_photoId_idx" ON "PhotoReaction"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoReaction_photoId_sessionId_emoji_key" ON "PhotoReaction"("photoId", "sessionId", "emoji");

-- AddForeignKey
ALTER TABLE "PhotoReaction" ADD CONSTRAINT "PhotoReaction_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
