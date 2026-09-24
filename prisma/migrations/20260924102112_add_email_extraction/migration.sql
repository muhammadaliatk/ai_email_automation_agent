-- CreateEnum
CREATE TYPE "EmailSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "EmailUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
ALTER TYPE "EmailStatus" ADD VALUE 'EXTRACTED';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "extractedEntities" JSONB,
ADD COLUMN     "sentiment" "EmailSentiment",
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "urgency" "EmailUrgency";
