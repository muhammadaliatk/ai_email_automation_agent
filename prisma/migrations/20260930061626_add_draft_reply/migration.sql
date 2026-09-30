-- AlterEnum
ALTER TYPE "EmailStatus" ADD VALUE 'DRAFTED';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "draftReply" TEXT;
