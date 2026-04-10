import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userIds = [
    '0500c078-9ea6-4647-858f-74b7be36045e',
    '0e5e8dfc-927f-4c98-a329-676f6f46705f',
  ];

  console.log('Force-clearing ACTIVE games for users:', userIds);

  const result = await prisma.game.updateMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { whitePlayerId: { in: userIds } },
        { blackPlayerId: { in: userIds } },
      ],
    },
    data: {
      status: 'ABORTED',
      endedAt: new Date(),
      endReason: 'RESIGN', // Using RESIGN or ABANDON to clear state
    },
  });

  console.log(`Successfully cleared ${result.count} games.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
