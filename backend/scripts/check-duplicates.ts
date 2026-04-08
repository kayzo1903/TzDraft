import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for TournamentMatch currentGameId duplicates...');
  const matches = await prisma.tournamentMatch.findMany({
    where: {
      currentGameId: { not: null },
    },
    select: {
      id: true,
      currentGameId: true,
    },
  });

  const seen = new Map<string, string[]>();
  for (const match of matches) {
    if (match.currentGameId) {
      if (!seen.has(match.currentGameId)) {
        seen.set(match.currentGameId, []);
      }
      seen.get(match.currentGameId)!.push(match.id);
    }
  }

  let duplicatesFound = false;
  for (const [gid, ids] of seen.entries()) {
    if (ids.length > 1) {
      duplicatesFound = true;
      console.log(`DUPLICATE currentGameId: ${gid} found in matches: ${ids.join(', ')}`);
    }
  }

  if (!duplicatesFound) {
    console.log('No non-null duplicate currentGameId found in TournamentMatch.');
  }

  console.log('\nChecking for Game tournamentMatchGameId duplicates...');
  const games = await prisma.game.findMany({
    where: {
      tournamentMatchGameId: { not: null },
    },
    select: {
      id: true,
      tournamentMatchGameId: true,
    },
  });

  const seenGames = new Map<string, string[]>();
  for (const game of games) {
    if (game.tournamentMatchGameId) {
      if (!seenGames.has(game.tournamentMatchGameId)) {
        seenGames.set(game.tournamentMatchGameId, []);
      }
      seenGames.get(game.tournamentMatchGameId)!.push(game.id);
    }
  }

  let gameDuplicatesFound = false;
  for (const [mid, ids] of seenGames.entries()) {
    if (ids.length > 1) {
      gameDuplicatesFound = true;
      console.log(`DUPLICATE tournamentMatchGameId: ${mid} found in games: ${ids.join(', ')}`);
    }
  }

  if (!gameDuplicatesFound) {
    console.log('No non-null duplicate tournamentMatchGameId found in Game.');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
