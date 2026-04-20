import { PrismaClient } from '@prisma/client';

async function countTokens() {
  const prisma = new PrismaClient();
  const total = await prisma.user.count();
  const withToken = await prisma.user.count({ where: { pushToken: { not: null } } });
  
  console.log(`Total users: ${total}`);
  console.log(`Users with tokens: ${withToken}`);
  
  await prisma.$disconnect();
}

countTokens();
