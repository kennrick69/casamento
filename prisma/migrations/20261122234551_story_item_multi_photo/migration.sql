-- Bosque: memórias com VÁRIAS fotos (carrossel) + legenda por foto.
-- Aditivo/seguro: adiciona coluna nullable e RELAXA o NOT NULL do título
-- (permite memória "só fotos"). Não apaga nem altera dado existente — linhas
-- antigas já têm título preenchido.
--  • "photos" → JSON [{ "key": "...", "caption": "..."|null }, ...] por memória.
--  • "title"  → passa a aceitar NULL (texto opcional).
ALTER TABLE "CoupleStoryItem" ADD COLUMN "photos" JSONB;
ALTER TABLE "CoupleStoryItem" ALTER COLUMN "title" DROP NOT NULL;
