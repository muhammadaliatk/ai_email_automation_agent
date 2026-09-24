-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('SUPPORT_REQUEST', 'BILLING', 'SALES_INQUIRY', 'COMPLAINT', 'SPAM', 'OTHER');

-- AlterEnum
ALTER TYPE "EmailStatus" ADD VALUE 'CLASSIFIED';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "category" "EmailCategory";
