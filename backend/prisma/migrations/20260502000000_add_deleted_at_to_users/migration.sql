-- Add soft-delete support: accounts pending deletion are marked with deleted_at.
-- After 30 days the cleanup cron permanently removes the row.
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
