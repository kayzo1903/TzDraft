-- Add social notification enum values that were missing from the DB
-- (schema had them but no migration was ever created for them)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOCIAL_FOLLOW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIENDSHIP_ESTABLISHED';
