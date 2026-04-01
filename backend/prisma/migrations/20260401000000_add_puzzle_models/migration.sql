-- CreateTable "puzzles"
CREATE TABLE "puzzles" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "pieces" JSONB NOT NULL,
    "sideToMove" TEXT NOT NULL,
    "solution" JSONB NOT NULL,
    "evalGap" INTEGER NOT NULL DEFAULT 0,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "theme" TEXT NOT NULL DEFAULT 'tactical',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source_game_id" TEXT,
    "source_move_num" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable "puzzle_attempts"
CREATE TABLE "puzzle_attempts" (
    "id" TEXT NOT NULL,
    "puzzle_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puzzles_status_idx" ON "puzzles"("status");

-- CreateIndex
CREATE INDEX "puzzles_difficulty_idx" ON "puzzles"("difficulty");

-- CreateIndex
CREATE INDEX "puzzles_theme_idx" ON "puzzles"("theme");

-- CreateIndex
CREATE INDEX "puzzles_source_game_id_idx" ON "puzzles"("source_game_id");

-- CreateIndex
CREATE INDEX "puzzle_attempts_puzzle_id_idx" ON "puzzle_attempts"("puzzle_id");

-- CreateIndex
CREATE INDEX "puzzle_attempts_user_id_idx" ON "puzzle_attempts"("user_id");

-- AddForeignKey
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_source_game_id_fkey" FOREIGN KEY ("source_game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable "games"
ALTER TABLE "games" ADD COLUMN "mined_for_puzzles" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "games_mined_for_puzzles_idx" ON "games"("mined_for_puzzles");
