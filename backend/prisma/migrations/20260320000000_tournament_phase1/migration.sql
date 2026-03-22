-- no_transaction
-- ALTER TYPE ... ADD VALUE cannot run inside a PostgreSQL transaction.

-- ============================================
-- 1. New enums (must be outside transaction)
-- ============================================
DO $$ BEGIN
    CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'DOUBLE_ELIMINATION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "TournamentStyle" AS ENUM ('BLITZ', 'RAPID', 'CLASSICAL', 'UNLIMITED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "TournamentScope" AS ENUM ('GLOBAL', 'COUNTRY', 'REGION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ParticipantStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'ELIMINATED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'BYE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MatchResult" AS ENUM ('PLAYER1_WIN', 'PLAYER2_WIN', 'BYE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MatchGameResult" AS ENUM ('PLAYER1_WIN', 'PLAYER2_WIN', 'DRAW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Extend existing GameType enum
ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'TOURNAMENT';

-- ============================================
-- 2. Ratings — career stats columns
-- ============================================
ALTER TABLE "ratings"
    ADD COLUMN IF NOT EXISTS "wins"                   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "losses"                 INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "draws"                  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "matchmaking_wins"       INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "highest_ai_level_beaten" INTEGER;

-- ============================================
-- 3. Games — tournament link column
-- ============================================
ALTER TABLE "games"
    ADD COLUMN IF NOT EXISTS "tournament_match_game_id" TEXT;

ALTER TABLE "games"
    DROP CONSTRAINT IF EXISTS "games_tournament_match_game_id_key";
ALTER TABLE "games"
    ADD CONSTRAINT "games_tournament_match_game_id_key" UNIQUE ("tournament_match_game_id");

-- ============================================
-- 4. Tournament tables
-- ============================================
CREATE TABLE IF NOT EXISTS "tournaments" (
    "id"                       TEXT         NOT NULL,
    "name"                     TEXT         NOT NULL,
    "description_en"           TEXT         NOT NULL,
    "description_sw"           TEXT         NOT NULL,
    "rules_en"                 TEXT,
    "rules_sw"                 TEXT,
    "format"                   "TournamentFormat" NOT NULL,
    "style"                    "TournamentStyle"  NOT NULL,
    "status"                   "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "scope"                    "TournamentScope"  NOT NULL DEFAULT 'GLOBAL',
    "country"                  TEXT,
    "region"                   TEXT,
    "min_elo"                  INTEGER,
    "max_elo"                  INTEGER,
    "min_matchmaking_wins"     INTEGER,
    "min_ai_level_beaten"      INTEGER,
    "required_ai_level_played" INTEGER,
    "max_players"              INTEGER      NOT NULL,
    "min_players"              INTEGER      NOT NULL DEFAULT 4,
    "registration_deadline"    TIMESTAMPTZ,
    "scheduled_start_at"       TIMESTAMPTZ  NOT NULL,
    "created_by_id"            TEXT         NOT NULL,
    "created_at"               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tournaments_created_by_id_fkey" FOREIGN KEY ("created_by_id")
        REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "tournament_participants" (
    "id"                TEXT              NOT NULL,
    "tournament_id"     TEXT              NOT NULL,
    "user_id"           TEXT              NOT NULL,
    "seed"              INTEGER,
    "elo_at_signup"     INTEGER           NOT NULL,
    "status"            "ParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
    "match_wins"        INTEGER           NOT NULL DEFAULT 0,
    "match_losses"      INTEGER           NOT NULL DEFAULT 0,
    "total_game_points" DOUBLE PRECISION  NOT NULL DEFAULT 0,
    "tiebreak_score"    DOUBLE PRECISION  NOT NULL DEFAULT 0,
    "registered_at"     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tournament_participants_tournament_id_user_id_key" UNIQUE ("tournament_id", "user_id"),
    CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id")
        REFERENCES "tournaments"("id") ON DELETE CASCADE,
    CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "tournament_rounds" (
    "id"            TEXT          NOT NULL,
    "tournament_id" TEXT          NOT NULL,
    "round_number"  INTEGER       NOT NULL,
    "status"        "RoundStatus" NOT NULL DEFAULT 'PENDING',
    "started_at"    TIMESTAMPTZ,
    "completed_at"  TIMESTAMPTZ,

    CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tournament_rounds_tournament_id_round_number_key" UNIQUE ("tournament_id", "round_number"),
    CONSTRAINT "tournament_rounds_tournament_id_fkey" FOREIGN KEY ("tournament_id")
        REFERENCES "tournaments"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "tournament_match_games" (
    "id"          TEXT              NOT NULL,
    "match_id"    TEXT              NOT NULL,
    "game_number" INTEGER           NOT NULL,
    "is_extra"    BOOLEAN           NOT NULL DEFAULT FALSE,
    "result"      "MatchGameResult",

    CONSTRAINT "tournament_match_games_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tournament_match_games_match_id_game_number_key" UNIQUE ("match_id", "game_number")
);

CREATE TABLE IF NOT EXISTS "tournament_matches" (
    "id"                  TEXT          NOT NULL,
    "round_id"            TEXT          NOT NULL,
    "tournament_id"       TEXT          NOT NULL,
    "player1_id"          TEXT,
    "player2_id"          TEXT,
    "status"              "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "result"              "MatchResult",
    "player1_wins"        INTEGER       NOT NULL DEFAULT 0,
    "player2_wins"        INTEGER       NOT NULL DEFAULT 0,
    "player1_consec_loss" INTEGER       NOT NULL DEFAULT 0,
    "player2_consec_loss" INTEGER       NOT NULL DEFAULT 0,
    "games_played"        INTEGER       NOT NULL DEFAULT 0,
    "player1_game_points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "player2_game_points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_game_id"     TEXT          UNIQUE,
    "started_at"          TIMESTAMPTZ,
    "completed_at"        TIMESTAMPTZ,

    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tournament_matches_round_id_fkey" FOREIGN KEY ("round_id")
        REFERENCES "tournament_rounds"("id") ON DELETE CASCADE
);

-- Fix self-referential FK on tournament_match_games after tournament_matches exists
ALTER TABLE "tournament_match_games"
    DROP CONSTRAINT IF EXISTS "tournament_match_games_match_id_fkey";
ALTER TABLE "tournament_match_games"
    ADD CONSTRAINT "tournament_match_games_match_id_fkey"
        FOREIGN KEY ("match_id") REFERENCES "tournament_matches"("id") ON DELETE CASCADE;

-- Remove the broken matches→match_games FK added above (was wrong direction)
ALTER TABLE "tournament_matches"
    DROP CONSTRAINT IF EXISTS "tournament_matches_match_game_fkey";

-- Add correct FK: games.tournament_match_game_id → tournament_match_games.id
ALTER TABLE "games"
    DROP CONSTRAINT IF EXISTS "games_tournament_match_game_id_fkey";
ALTER TABLE "games"
    ADD CONSTRAINT "games_tournament_match_game_id_fkey"
        FOREIGN KEY ("tournament_match_game_id") REFERENCES "tournament_match_games"("id") ON DELETE SET NULL;

-- ============================================
-- 5. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS "tournaments_status_idx"        ON "tournaments"("status");
CREATE INDEX IF NOT EXISTS "tournaments_scope_idx"         ON "tournaments"("scope");
CREATE INDEX IF NOT EXISTS "tournaments_country_idx"       ON "tournaments"("country");
CREATE INDEX IF NOT EXISTS "tournament_matches_tournament_id_idx" ON "tournament_matches"("tournament_id");
