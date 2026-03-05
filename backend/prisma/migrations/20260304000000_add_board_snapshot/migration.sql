-- Add board_snapshot column to games table.
-- Stores the serialized board state after each move so we do not need to
-- replay the full move history on every game load.
-- The column is nullable: existing games will build their snapshot lazily
-- on first update after this migration.

ALTER TABLE "games" ADD COLUMN "board_snapshot" JSONB;
