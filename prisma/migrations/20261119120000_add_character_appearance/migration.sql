-- S3: guarda a aparência completa do personagem (rosto, cabelo, roupa) como JSON.
-- Aditivo: só adiciona uma coluna nullable. Não altera nada existente.
ALTER TABLE "GameCharacter" ADD COLUMN "appearance" JSONB;
