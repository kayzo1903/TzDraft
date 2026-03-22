ALTER TABLE "ratings"
ADD COLUMN "highest_ai_level_played" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "highest_unlocked_ai_level" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE "ai_challenge_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ai_level" INTEGER NOT NULL,
    "player_color" TEXT NOT NULL,
    "result" TEXT,
    "undo_used" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_challenge_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_challenge_sessions_user_id_ai_level_idx" ON "ai_challenge_sessions"("user_id", "ai_level");
CREATE INDEX "ai_challenge_sessions_user_id_completed_at_idx" ON "ai_challenge_sessions"("user_id", "completed_at");

ALTER TABLE "ai_challenge_sessions"
ADD CONSTRAINT "ai_challenge_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
