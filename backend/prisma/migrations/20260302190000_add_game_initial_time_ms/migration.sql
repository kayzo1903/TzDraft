-- AddColumn: initial_time_ms on games
ALTER TABLE "games"
ADD COLUMN "initial_time_ms" INTEGER NOT NULL DEFAULT 600000;
