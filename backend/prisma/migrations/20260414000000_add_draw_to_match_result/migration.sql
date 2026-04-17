-- Add DRAW to the MatchResult enum.
-- The original tournament_phase1 migration created this enum without DRAW:
--   CREATE TYPE "MatchResult" AS ENUM ('PLAYER1_WIN', 'PLAYER2_WIN', 'BYE');
-- The Prisma schema was later updated to include DRAW but no migration was run.
-- PostgreSQL requires ALTER TYPE … ADD VALUE for enum extensions.

ALTER TYPE "MatchResult" ADD VALUE IF NOT EXISTS 'DRAW';
