import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const campaigns = await prisma.communicationCampaign.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      channels: true,
      priority: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(campaigns, null, 2));
  await prisma.$disconnect();
}

main();
