-- CreateEnum
CREATE TYPE "FriendlyMatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "friendly_matches" (
    "id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "invited_friend_id" TEXT,
    "guest_id" TEXT,
    "status" "FriendlyMatchStatus" NOT NULL DEFAULT 'PENDING',
    "invite_token" TEXT NOT NULL,
    "game_id" TEXT,
    "initial_time_ms" INTEGER NOT NULL DEFAULT 600000,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendly_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "friendly_matches_invite_token_key" ON "friendly_matches"("invite_token");

-- CreateIndex
CREATE INDEX "friendly_matches_host_id_status_idx" ON "friendly_matches"("host_id", "status");

-- CreateIndex
CREATE INDEX "friendly_matches_invited_friend_id_status_idx" ON "friendly_matches"("invited_friend_id", "status");

-- CreateIndex
CREATE INDEX "friendly_matches_invite_token_idx" ON "friendly_matches"("invite_token");

-- AddForeignKey
ALTER TABLE "friendly_matches" ADD CONSTRAINT "friendly_matches_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendly_matches" ADD CONSTRAINT "friendly_matches_invited_friend_id_fkey" FOREIGN KEY ("invited_friend_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendly_matches" ADD CONSTRAINT "friendly_matches_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

