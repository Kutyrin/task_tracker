-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetRequestedAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT;
