-- Add setup move context so the puzzle player can animate the opponent's last move
ALTER TABLE "puzzles" ADD COLUMN IF NOT EXISTS "setup_move"   JSONB;
ALTER TABLE "puzzles" ADD COLUMN IF NOT EXISTS "setup_pieces" JSONB;
