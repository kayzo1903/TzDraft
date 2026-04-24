-- Add terms_accepted_at to users
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" TIMESTAMP(3);

-- Add POLICY_UPDATE to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE 'POLICY_UPDATE';
