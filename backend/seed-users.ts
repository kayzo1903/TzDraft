import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      id: 'user-1',
      phoneNumber: '+255712345678',
      username: 'player1',
      email: 'player1@example.com',
      displayName: 'Player One',
      passwordHash: 'dummy',
    },
    {
      id: 'user-2',
      phoneNumber: '+255723456789',
      username: 'player2',
      email: 'player2@example.com',
      displayName: 'Player Two',
      passwordHash: 'dummy',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {}, // Do nothing if exists
      create: user,
    });
    console.log(`User ${user.id} seeded.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
