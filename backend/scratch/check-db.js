const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.game.groupBy({
    by: ['gameType', 'status'],
    _count: { id: true }
  });
  console.log('Game Counts:', JSON.stringify(counts, null, 2));

  const aiUser = await prisma.user.findUnique({
    where: { id: 'AI' }
  });
  console.log('AI User in DB:', JSON.stringify(aiUser, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
