-- CreateTable
CREATE TABLE "matchmaking_queue" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "time_ms"    INTEGER NOT NULL,
    "socket_id"  TEXT NOT NULL,
    "joined_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating"     INTEGER,
    "rd"         DOUBLE PRECISION,
    "volatility" DOUBLE PRECISION,

    CONSTRAINT "matchmaking_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matchmaking_queue_user_id_key" ON "matchmaking_queue"("user_id");

-- CreateIndex
CREATE INDEX "matchmaking_queue_time_ms_joined_at_idx" ON "matchmaking_queue"("time_ms", "joined_at");

-- AddForeignKey
ALTER TABLE "matchmaking_queue"
    ADD CONSTRAINT "matchmaking_queue_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
