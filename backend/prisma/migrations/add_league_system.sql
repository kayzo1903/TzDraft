-- ============================================================
-- League System Migration — adds new tables only, no data loss
-- ============================================================

-- 1. Enums

DO $$ BEGIN
    CREATE TYPE "LeagueStatus" AS ENUM ('REGISTRATION', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LeagueParticipantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISQUALIFIED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LeagueRoundStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LeagueMatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FORFEITED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LeagueMatchResult" AS ENUM ('PLAYER1_WIN', 'PLAYER2_WIN', 'DRAW', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LeagueGameStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FORFEITED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LeagueGameResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add LEAGUE to GameType enum (safe: only adds value)
DO $$ BEGIN
    ALTER TYPE "GameType" ADD VALUE 'LEAGUE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. leagues

CREATE TABLE IF NOT EXISTS "leagues" (
    "id"                   TEXT NOT NULL,
    "name"                 TEXT NOT NULL,
    "status"               "LeagueStatus" NOT NULL DEFAULT 'REGISTRATION',
    "start_date"           TIMESTAMP(3),
    "end_date"             TIMESTAMP(3),
    "max_players"          INTEGER NOT NULL DEFAULT 12,
    "current_round"        INTEGER NOT NULL DEFAULT 0,
    "round_duration_days"  INTEGER NOT NULL DEFAULT 7,
    "created_by_id"        TEXT NOT NULL,
    "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leagues_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. league_participants

CREATE TABLE IF NOT EXISTS "league_participants" (
    "id"                  TEXT NOT NULL,
    "league_id"           TEXT NOT NULL,
    "user_id"             TEXT NOT NULL,
    "status"              "LeagueParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "match_points"        INTEGER NOT NULL DEFAULT 0,
    "match_wins"          INTEGER NOT NULL DEFAULT 0,
    "match_draws"         INTEGER NOT NULL DEFAULT 0,
    "match_losses"        INTEGER NOT NULL DEFAULT 0,
    "matches_played"      INTEGER NOT NULL DEFAULT 0,
    "consecutive_missed"  INTEGER NOT NULL DEFAULT 0,
    "goals_for"           DECIMAL(5,1) NOT NULL DEFAULT 0,
    "goals_against"       DECIMAL(5,1) NOT NULL DEFAULT 0,
    "goal_difference"     DECIMAL(5,1) NOT NULL DEFAULT 0,
    "registered_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "league_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_participants_league_id_user_id_key" UNIQUE ("league_id", "user_id"),
    CONSTRAINT "league_participants_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "league_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "league_participants_league_id_match_points_idx"
    ON "league_participants"("league_id", "match_points" DESC);

-- 4. league_rounds

CREATE TABLE IF NOT EXISTS "league_rounds" (
    "id"           TEXT NOT NULL,
    "league_id"    TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "status"       "LeagueRoundStatus" NOT NULL DEFAULT 'PENDING',
    "deadline"     TIMESTAMP(3),
    CONSTRAINT "league_rounds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_rounds_league_id_round_number_key" UNIQUE ("league_id", "round_number"),
    CONSTRAINT "league_rounds_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. league_matches

CREATE TABLE IF NOT EXISTS "league_matches" (
    "id"            TEXT NOT NULL,
    "league_id"     TEXT NOT NULL,
    "round_id"      TEXT NOT NULL,
    "player1_id"    TEXT NOT NULL,
    "player2_id"    TEXT NOT NULL,
    "status"        "LeagueMatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "deadline"      TIMESTAMP(3),
    "player1_goals" DECIMAL(3,1) NOT NULL DEFAULT 0,
    "player2_goals" DECIMAL(3,1) NOT NULL DEFAULT 0,
    "result"        "LeagueMatchResult" NOT NULL DEFAULT 'PENDING',
    "forfeited_by"  TEXT,
    "void_reason"   TEXT,
    "completed_at"  TIMESTAMP(3),
    CONSTRAINT "league_matches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_matches_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "league_matches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "league_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "league_matches_league_id_idx" ON "league_matches"("league_id");
CREATE INDEX IF NOT EXISTS "league_matches_round_id_idx"  ON "league_matches"("round_id");
CREATE INDEX IF NOT EXISTS "league_matches_player1_id_idx" ON "league_matches"("player1_id");
CREATE INDEX IF NOT EXISTS "league_matches_player2_id_idx" ON "league_matches"("player2_id");

-- 6. league_games

CREATE TABLE IF NOT EXISTS "league_games" (
    "id"              TEXT NOT NULL,
    "match_id"        TEXT NOT NULL,
    "league_id"       TEXT NOT NULL,
    "game_number"     INTEGER NOT NULL,
    "white_player_id" TEXT NOT NULL,
    "black_player_id" TEXT NOT NULL,
    "status"          "LeagueGameStatus" NOT NULL DEFAULT 'PENDING',
    "result"          "LeagueGameResult" NOT NULL DEFAULT 'PENDING',
    "forfeited_by"    TEXT,
    "completed_at"    TIMESTAMP(3),
    CONSTRAINT "league_games_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_games_match_id_game_number_key" UNIQUE ("match_id", "game_number"),
    CONSTRAINT "league_games_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "league_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. disconnection_events

CREATE TABLE IF NOT EXISTS "disconnection_events" (
    "id"               TEXT NOT NULL,
    "match_id"         TEXT NOT NULL,
    "game_id"          TEXT NOT NULL,
    "player_id"        TEXT NOT NULL,
    "disconnected_at"  TIMESTAMP(3) NOT NULL,
    "reconnected_at"   TIMESTAMP(3),
    "forfeited_at"     TIMESTAMP(3),
    "duration"         INTEGER,
    CONSTRAINT "disconnection_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "disconnection_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "league_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "disconnection_events_match_id_idx"  ON "disconnection_events"("match_id");
CREATE INDEX IF NOT EXISTS "disconnection_events_game_id_idx"   ON "disconnection_events"("game_id");

-- 8. Add league_game_id column to games table

ALTER TABLE "games"
    ADD COLUMN IF NOT EXISTS "league_game_id" TEXT;

-- unique constraint only if not already present
DO $$ BEGIN
    ALTER TABLE "games" ADD CONSTRAINT "games_league_game_id_key" UNIQUE ("league_game_id");
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "games" ADD CONSTRAINT "games_league_game_id_fkey" FOREIGN KEY ("league_game_id") REFERENCES "league_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN invalid_table_definition THEN NULL; END $$;
