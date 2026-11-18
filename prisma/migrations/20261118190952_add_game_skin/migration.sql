-- CreateEnum
CREATE TYPE "GameSkin" AS ENUM ('METAL', 'PIXEL', 'FAIRYTALE');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "gameSkin" "GameSkin" NOT NULL DEFAULT 'FAIRYTALE';
