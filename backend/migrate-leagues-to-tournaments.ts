import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addEnumSafely(enumName: string, enumValue: string) {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM pg_enum
      WHERE enumlabel = '${enumValue}'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = '${enumName}'
      )
    `);
    if (Array.isArray(result) && result.length === 0) {
      console.log(`Adding ${enumValue} to enum ${enumName}`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "${enumName}" ADD VALUE '${enumValue}'`);
    } else {
      console.log(`Enum ${enumValue} already exists in ${enumName}`);
    }
  } catch (error) {
    console.error(`Error checking/adding enum ${enumValue} to ${enumName}:`, error);
  }
}

async function main() {
  console.log('Applying safe structural migrations (bypassing Prisma db push dropping unknown tables)...');

  try {
    // 1. Alter Enums securely
    await addEnumSafely('TournamentFormat', 'ROUND_ROBIN');
    await addEnumSafely('MatchStatus', 'FORFEIT');

    // 2. Add columns to tournaments
    await prisma.$executeRaw`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS "current_round" INT NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS "round_duration_days" INT NOT NULL DEFAULT 7;`;

    // 3. Add columns to tournament_participants
    await prisma.$executeRaw`ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS "match_points" INT NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS "match_draws" INT NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS "matches_played" INT NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS "consecutive_missed" INT NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS "goals_for" DECIMAL(5,1) NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS "goals_against" DECIMAL(5,1) NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS "goal_difference" DECIMAL(5,1) NOT NULL DEFAULT 0;`;

    console.log('Structural migration successful.');

    // 4. MIGRATION DATA FROM LEAGUES TO TOURNAMENTS
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'leagues'
      );
    `;

    if (!(tableCheck as any)[0].exists) {
      console.log('League table does not exist. No data to migrate.');
      return;
    }

    console.log('Moving data from League tables to Tournament tables...');
    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO tournaments (
          id, name, description_en, description_sw, rules_en, rules_sw,
          style, status, scope, country, region,
          min_elo, max_elo, min_matchmaking_wins, min_ai_level_beaten, required_ai_level_played,
          min_players, max_players, scheduled_start_at, registration_deadline,
          hidden, created_by_id, created_at, updated_at,
          format, current_round, round_duration_days
        )
        SELECT 
          id, name, description_en, description_sw, rules_en, rules_sw,
          style, 
          CASE WHEN status::text = 'REGISTRATION' THEN 'REGISTRATION'::"TournamentStatus"
               WHEN status::text = 'ACTIVE' THEN 'ACTIVE'::"TournamentStatus"
               WHEN status::text = 'COMPLETED' THEN 'COMPLETED'::"TournamentStatus"
               WHEN status::text = 'CANCELLED' THEN 'CANCELLED'::"TournamentStatus"
               ELSE 'DRAFT'::"TournamentStatus" END,
          scope, country, region,
          min_elo, max_elo, min_matchmaking_wins, min_ai_level_beaten, required_ai_level_played,
          min_players, max_players, scheduled_start_at, registration_deadline,
          hidden, created_by_id, created_at, updated_at,
          'ROUND_ROBIN'::"TournamentFormat", current_round, round_duration_days
        FROM leagues
        ON CONFLICT (id) DO NOTHING;
      `,

      prisma.$executeRaw`
        INSERT INTO tournament_prizes (
          id, tournament_id, placement, amount, currency, label
        )
        SELECT id, league_id, placement, amount, currency, label
        FROM league_prizes
        ON CONFLICT (id) DO NOTHING;
      `,

      prisma.$executeRaw`
        INSERT INTO tournament_participants (
          id, tournament_id, user_id, 
          status, elo_at_signup, registered_at,
          match_wins, match_losses,
          match_points, match_draws, matches_played, consecutive_missed,
          goals_for, goals_against, goal_difference,
          total_game_points
        )
        SELECT 
          id, league_id, user_id,
          CASE WHEN status::text = 'ACTIVE' THEN 'ACTIVE'::"ParticipantStatus"
               WHEN status::text = 'WITHDRAWN' THEN 'WITHDRAWN'::"ParticipantStatus"
               ELSE 'REGISTERED'::"ParticipantStatus" END,
          1200, 
          registered_at,
          match_wins, match_losses,
          match_points, match_draws, matches_played, consecutive_missed,
          goals_for, goals_against, goal_difference,
          CAST(goals_for AS double precision)
        FROM league_participants
        ON CONFLICT (id) DO NOTHING;
      `,

      prisma.$executeRaw`
        INSERT INTO tournament_rounds (
           id, tournament_id, round_number, status
        )
        SELECT 
           id, league_id, round_number, 
           CASE WHEN status::text = 'PENDING' THEN 'PENDING'::"RoundStatus"
                WHEN status::text = 'ACTIVE' THEN 'ACTIVE'::"RoundStatus"
                WHEN status::text = 'COMPLETED' THEN 'COMPLETED'::"RoundStatus"
                ELSE 'PENDING'::"RoundStatus" END
        FROM league_rounds
        ON CONFLICT (id) DO NOTHING;
      `,

      prisma.$executeRaw`
        INSERT INTO tournament_matches (
           id, round_id, tournament_id, player1_id, player2_id,
           status, result, 
           player1_wins, player2_wins, games_played,
           player1_game_points, player2_game_points,
           started_at, completed_at
        )
        SELECT
           id, round_id, league_id, player1_id, player2_id,
           CASE WHEN status::text = 'SCHEDULED' THEN 'PENDING'::"MatchStatus"
                WHEN status::text = 'ACTIVE' THEN 'ACTIVE'::"MatchStatus"
                WHEN status::text = 'COMPLETED' THEN 'COMPLETED'::"MatchStatus"
                WHEN status::text = 'FORFEIT_P1' THEN 'COMPLETED'::"MatchStatus"
                WHEN status::text = 'FORFEIT_P2' THEN 'COMPLETED'::"MatchStatus"
                WHEN status::text = 'DOUBLE_FORFEIT' THEN 'COMPLETED'::"MatchStatus"
                WHEN status::text = 'BYE' THEN 'BYE'::"MatchStatus"
                ELSE 'PENDING'::"MatchStatus" END,
           CASE WHEN result::text = 'PLAYER1_WIN' THEN 'PLAYER1_WIN'::"MatchResult"
                WHEN result::text = 'PLAYER2_WIN' THEN 'PLAYER2_WIN'::"MatchResult"
                WHEN result::text = 'BYE' THEN 'BYE'::"MatchResult"
                ELSE NULL END,
           0, 0, 0,
           CAST(player1_goals AS double precision), CAST(player2_goals AS double precision),
           NULL, completed_at
        FROM league_matches
        ON CONFLICT (id) DO NOTHING;
      `,

      prisma.$executeRaw`
        INSERT INTO tournament_match_games (
           id, match_id, game_number, is_extra, result
        )
        SELECT
           id, match_id, game_number, false,
           CASE WHEN result::text = 'PLAYER1_WIN' THEN 'PLAYER1_WIN'::"MatchGameResult"
                WHEN result::text = 'PLAYER2_WIN' THEN 'PLAYER2_WIN'::"MatchGameResult"
                WHEN result::text = 'DRAW' THEN 'DRAW'::"MatchGameResult"
                ELSE NULL END
        FROM league_games
        ON CONFLICT (id) DO NOTHING;
      `,
    ]);

    console.log('Migration complete. Checking Prisma client sync...');

  } catch (e: any) {
    console.error('Migration failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
