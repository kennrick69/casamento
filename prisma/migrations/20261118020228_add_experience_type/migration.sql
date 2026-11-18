-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('CLASSIC', 'GAMIFIED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "experienceType" "ExperienceType" NOT NULL DEFAULT 'CLASSIC';
