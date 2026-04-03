-- Fix: highest_unlocked_ai_level default was 5 in DB but schema and constants say 3.
-- Only affects NEW rows (existing user data is unchanged).
ALTER TABLE "ratings" ALTER COLUMN "highest_unlocked_ai_level" SET DEFAULT 3;

-- Fix: highest_ai_level_beaten had no default; add DEFAULT 0 so new rows
-- don't require an explicit value. Existing NULL rows are preserved as-is
-- (NULL continues to mean "never beaten any AI level" for the COALESCE in the service).
ALTER TABLE "ratings" ALTER COLUMN "highest_ai_level_beaten" SET DEFAULT 0;
