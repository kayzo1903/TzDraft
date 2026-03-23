CREATE TABLE "matchmaking_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "time_ms" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "matched_at" TIMESTAMP(3),
    "game_id" TEXT,
    "cancel_reason" TEXT,

    CONSTRAINT "matchmaking_searches_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "matchmaking_searches"
ADD CONSTRAINT "matchmaking_searches_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "matchmaking_searches_user_id_status_idx"
ON "matchmaking_searches"("user_id", "status");

CREATE INDEX "matchmaking_searches_status_idx"
ON "matchmaking_searches"("status");

CREATE INDEX "matchmaking_searches_started_at_idx"
ON "matchmaking_searches"("started_at");

CREATE INDEX "matchmaking_searches_game_id_idx"
ON "matchmaking_searches"("game_id");
