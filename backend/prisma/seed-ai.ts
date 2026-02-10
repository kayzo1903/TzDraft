import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AI User...');

  const aiUser = await prisma.user.upsert({
    where: { id: 'AI' },
    update: {},
    create: {
      id: 'AI',
      username: 'AI_BOT',
      displayName: 'AI Bot',
      phoneNumber: '0000000000', // Dummy phone
      email: 'ai@tzdraft.com', // Dummy email
      isVerified: true,
      passwordHash: 'AI_HAS_NO_PASSWORD',
    },
  });

  console.log('✅ AI User seeded:', aiUser);

  const testUser = await prisma.user.upsert({
    where: { id: 'test-user' },
    update: {},
    create: {
      id: 'test-user',
      username: 'TestUser',
      displayName: 'Test User',
      phoneNumber: '9999999999',
      email: 'test@example.com',
      isVerified: true,
      passwordHash: 'TEST_PASSWORD',
    },
  });
  console.log('✅ Test User seeded:', testUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
