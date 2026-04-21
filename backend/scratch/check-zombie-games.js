const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGames() {
  const waitingGames = await prisma.game.findMany({
    where: { status: 'WAITING' },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total WAITING games: ${waitingGames.length}`);
  
  if (waitingGames.length > 0) {
    console.log('Most recent WAITING games:');
    waitingGames.slice(0, 5).forEach(g => {
      console.log(`- ID: ${g.id}, Created: ${g.createdAt}, Type: ${g.gameType}, White: ${g.whitePlayerId}, Black: ${g.blackPlayerId}`);
    });
  }

  await prisma.$disconnect();
}

checkGames().catch(console.error);
