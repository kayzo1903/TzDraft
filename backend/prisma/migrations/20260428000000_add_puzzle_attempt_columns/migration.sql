-- Add time_taken and points columns to puzzle_attempts
ALTER TABLE "puzzle_attempts" ADD COLUMN IF NOT EXISTS "time_taken" INTEGER;
ALTER TABLE "puzzle_attempts" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;
