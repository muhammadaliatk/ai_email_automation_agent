-- AlterEnum
ALTER TYPE "EmailStatus" ADD VALUE 'SENT';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "sentAt" TIMESTAMP(3);
