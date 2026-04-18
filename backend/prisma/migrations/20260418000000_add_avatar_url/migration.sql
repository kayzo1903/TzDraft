-- AddColumn: avatar_url on users
-- Nullable column — existing rows default to NULL, no data loss.
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
