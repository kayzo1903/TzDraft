-- CreateTable: tracks which puzzle IDs have already affected a user's rating.
-- Composite PK (user_id, puzzle_id) enforces one rating event per puzzle per user.
CREATE TABLE "user_rated_puzzles" (
    "user_id"    TEXT NOT NULL,
    "puzzle_id"  TEXT NOT NULL,
    "points"     INTEGER NOT NULL,
    "rated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_rated_puzzles_pkey" PRIMARY KEY ("user_id", "puzzle_id")
);

-- Foreign keys
ALTER TABLE "user_rated_puzzles"
    ADD CONSTRAINT "user_rated_puzzles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_rated_puzzles"
    ADD CONSTRAINT "user_rated_puzzles_puzzle_id_fkey"
    FOREIGN KEY ("puzzle_id") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
