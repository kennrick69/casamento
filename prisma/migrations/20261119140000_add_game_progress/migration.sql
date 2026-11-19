-- Progresso do jogo por convidado (Modo Gamificado · fases). Aditiva e nullable:
-- null = começou do zero. Shape: { phase1, phase2, phase3, memoriesSeen[] }.
ALTER TABLE "GameCharacter" ADD COLUMN "gameProgress" JSONB;
