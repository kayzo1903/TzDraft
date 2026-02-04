-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED', 'ABORTED');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('RANKED', 'CASUAL', 'AI');

-- CreateEnum
CREATE TYPE "Winner" AS ENUM ('WHITE', 'BLACK', 'DRAW');

-- CreateEnum
CREATE TYPE "EndReason" AS ENUM ('CHECKMATE', 'RESIGN', 'TIME', 'DISCONNECT', 'DRAW');

-- CreateEnum
CREATE TYPE "Player" AS ENUM ('WHITE', 'BLACK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "game_type" "GameType" NOT NULL,
    "rule_version" TEXT NOT NULL DEFAULT 'TZ-8x8-v1',
    "white_player_id" TEXT NOT NULL,
    "black_player_id" TEXT,
    "white_elo" INTEGER,
    "black_elo" INTEGER,
    "ai_level" INTEGER,
    "winner" "Winner",
    "end_reason" "EndReason",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moves" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "move_number" INTEGER NOT NULL,
    "player" "Player" NOT NULL,
    "from_square" INTEGER NOT NULL,
    "to_square" INTEGER NOT NULL,
    "captured_squares" INTEGER[],
    "is_promotion" BOOLEAN NOT NULL DEFAULT false,
    "is_multi_capture" BOOLEAN NOT NULL DEFAULT false,
    "notation" TEXT NOT NULL,
    "engine_eval" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clocks" (
    "game_id" TEXT NOT NULL,
    "white_time_ms" BIGINT NOT NULL,
    "black_time_ms" BIGINT NOT NULL,
    "last_move_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clocks_pkey" PRIMARY KEY ("game_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "moves_game_id_move_number_key" ON "moves"("game_id", "move_number");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_white_player_id_fkey" FOREIGN KEY ("white_player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_black_player_id_fkey" FOREIGN KEY ("black_player_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clocks" ADD CONSTRAINT "clocks_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
