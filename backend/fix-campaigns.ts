import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const result = await prisma.communicationCampaign.updateMany({
    where: {
      status: 'SENT',
      OR: [
        { channels: { has: 'MOBILE_HOME_BANNER' } },
        { priority: 'HIGH' },
        { priority: 'CRITICAL' },
      ],
    },
    data: {
      status: 'LIVE',
    },
  });
  console.log(`Updated ${result.count} campaigns to LIVE status.`);
  await prisma.$disconnect();
}

main();
