-- CreateTable
CREATE TABLE "QATestRun" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "results" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,

    CONSTRAINT "QATestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QATestRun_createdById_startedAt_idx" ON "QATestRun"("createdById", "startedAt");

-- AddForeignKey
ALTER TABLE "QATestRun" ADD CONSTRAINT "QATestRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
