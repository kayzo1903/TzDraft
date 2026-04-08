import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Fetching Indexes ---');
  const indexes: any[] = await prisma.$queryRaw`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename IN ('games', 'tournament_matches', 'tournament_match_games')
  `;
  console.table(indexes);

  console.log('\n--- Checking for duplicates in Games (tournament_match_game_id) ---');
  const gameDuplicates: any[] = await prisma.$queryRaw`
    SELECT "tournament_match_game_id", count(*) 
    FROM "games" 
    WHERE "tournament_match_game_id" IS NOT NULL 
    GROUP BY "tournament_match_game_id" 
    HAVING count(*) > 1
  `;
  console.log('Game Duplicates:', gameDuplicates);

  console.log('\n--- Checking for duplicates in TournamentMatches (current_game_id) ---');
  const matchDuplicates: any[] = await prisma.$queryRaw`
    SELECT "current_game_id", count(*) 
    FROM "tournament_matches" 
    WHERE "current_game_id" IS NOT NULL 
    GROUP BY "current_game_id" 
    HAVING count(*) > 1
  `;
  console.log('Match Duplicates:', matchDuplicates);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
