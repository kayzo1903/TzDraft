const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = [
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "description_en" TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "description_sw" TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "rules_en" TEXT;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "rules_sw" TEXT;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "style" "TournamentStyle" NOT NULL DEFAULT 'RAPID';`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "scope" "TournamentScope" NOT NULL DEFAULT 'GLOBAL';`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "country" TEXT;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "region" TEXT;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "min_elo" INTEGER;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "max_elo" INTEGER;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "min_matchmaking_wins" INTEGER;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "min_ai_level_beaten" INTEGER;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "required_ai_level_played" INTEGER;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "min_players" INTEGER NOT NULL DEFAULT 4;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "scheduled_start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "registration_deadline" TIMESTAMP(3);`,
    `CREATE TABLE IF NOT EXISTS "league_prizes" (
        "id" TEXT NOT NULL,
        "league_id" TEXT NOT NULL,
        "placement" INTEGER NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "currency" "PrizeCurrency" NOT NULL DEFAULT 'TSH',
        "label" TEXT,
        CONSTRAINT "league_prizes_pkey" PRIMARY KEY ("id")
    );`,
    `DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'league_prizes_league_id_placement_key'
        ) THEN
            CREATE UNIQUE INDEX "league_prizes_league_id_placement_key" ON "league_prizes"("league_id", "placement");
        END IF;
    END $$;`,
    `DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'league_prizes_league_id_fkey'
        ) THEN
            ALTER TABLE "league_prizes" ADD CONSTRAINT "league_prizes_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END $$;`
  ];

  for (const query of queries) {
    console.log("Executing:", query);
    await prisma.$executeRawUnsafe(query);
  }
  console.log("Migration complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
