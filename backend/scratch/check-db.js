
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing connection to DATABASE_URL...');
  try {
    await prisma.$connect();
    console.log('Successfully connected to DATABASE_URL!');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
  } catch (err) {
    console.error('Failed to connect to DATABASE_URL:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
