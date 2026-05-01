-- Add puzzle_rating column to ratings table.
-- Default 1000 is applied to all existing rows automatically.
ALTER TABLE "ratings"
    ADD COLUMN "puzzle_rating" INTEGER NOT NULL DEFAULT 1000;
