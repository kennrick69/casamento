-- AlterTable: add archival warning timestamp for LGPD retention policy
ALTER TABLE "Event" ADD COLUMN "archivalWarningAt" TIMESTAMP(3);

-- AlterEnum: add ACCOUNT_DELETED action for LGPD audit log
ALTER TYPE "AuthAction" ADD VALUE 'ACCOUNT_DELETED';
