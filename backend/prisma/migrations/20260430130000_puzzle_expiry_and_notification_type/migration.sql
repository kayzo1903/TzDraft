-- Add PUZZLE_RELEASED to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PUZZLE_RELEASED';

-- Add expires_at column to puzzles (nullable — old puzzles have no expiry)
ALTER TABLE "puzzles"
    ADD COLUMN "expires_at" TIMESTAMP(3);

-- Index to make expiry filtering fast
CREATE INDEX "puzzles_expires_at_idx" ON "puzzles"("expires_at");
