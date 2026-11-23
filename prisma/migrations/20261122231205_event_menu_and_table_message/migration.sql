-- Modo Gamificado: conteúdo configurável do salão (Grande Dia).
-- Aditivo: só adiciona duas colunas nullable. Não altera nem apaga nada existente.
--  • "menu"              → cardápio do Garçom (JSON: foods[], drinks[], byoNotice).
--                          null = jogo usa o cardápio de EXEMPLO até o casal cadastrar.
--  • "tableFoundMessage" → recado ao convidado quando ele acha a própria mesa.
--                          null = cai no texto genérico de agradecimento.
ALTER TABLE "Event" ADD COLUMN "menu" JSONB;
ALTER TABLE "Event" ADD COLUMN "tableFoundMessage" TEXT;
