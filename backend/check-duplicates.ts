import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT phone_number, COUNT(*) 
      FROM users 
      GROUP BY phone_number 
      HAVING COUNT(*) > 1
    `;

    console.log('Duplicate phone numbers found:', duplicates);

    const allUsers = await prisma.user.findMany({
      select: { phoneNumber: true, username: true },
    });
    console.log('Current users and phone numbers:', allUsers);
  } catch (error) {
    console.error('Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
