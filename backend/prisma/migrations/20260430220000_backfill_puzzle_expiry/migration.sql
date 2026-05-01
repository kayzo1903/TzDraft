-- Backfill: set published_at and expires_at for APPROVED puzzles
-- that were approved before the expires_at column was introduced.
-- publishedAt is reset to NOW() and expiresAt is set to NOW() + 24 hours.
UPDATE "puzzles"
SET
    "published_at" = NOW(),
    "expires_at"   = NOW() + INTERVAL '24 hours'
WHERE
    "status"      = 'APPROVED'
    AND "expires_at" IS NULL;
