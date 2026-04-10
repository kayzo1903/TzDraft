import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userIds = [
    '0500c078-9ea6-4647-858f-74b7be36045e',
    '0e5e8dfc-927f-4c98-a329-676f6f46705f',
  ];

  console.log('Performing DEEP CLEAN for users:', userIds);

  const result = await prisma.game.updateMany({
    where: {
      status: { in: ['ACTIVE', 'WAITING'] },
      OR: [
        { whitePlayerId: { in: userIds } },
        { blackPlayerId: { in: userIds } },
      ],
    },
    data: {
      status: 'ABORTED',
      endedAt: new Date(),
      endReason: 'NO_MOVES',
    },
  });

  console.log(`Deep clean complete. Aborted ${result.count} games.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
