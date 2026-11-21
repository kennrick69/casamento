-- S3: FK de GameCharacter.lockedByRoleId -> EventRole com ON DELETE SET NULL.
-- Aditivo: só adiciona índice + constraint. Não altera colunas nem dados.

-- CreateIndex
CREATE INDEX "GameCharacter_lockedByRoleId_idx" ON "GameCharacter"("lockedByRoleId");

-- AddForeignKey
ALTER TABLE "GameCharacter" ADD CONSTRAINT "GameCharacter_lockedByRoleId_fkey" FOREIGN KEY ("lockedByRoleId") REFERENCES "EventRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
