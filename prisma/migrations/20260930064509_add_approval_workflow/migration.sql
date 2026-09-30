-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailStatus" ADD VALUE 'APPROVED';
ALTER TYPE "EmailStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "finalReply" TEXT,
ADD COLUMN     "rejectionReason" TEXT;
