import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const WELCOME_NOTIFICATION = {
  title: 'Welcome to TzDraft!',
  body: 'Cheza Drafti mtandaoni na wapezaji wa Tanzania. Jiunge na ligi, pambana na AI, au mualike rafiki!',
  bodyEn: 'Play Drafti online with players from Tanzania. Join leagues, compete against AI, or invite friends!',
};

async function sendWelcomeNotifications() {
  console.log('🔔 Sending welcome notifications to all users...\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, phoneNumber: true },
  });

  console.log(`Found ${users.length} users\n`);

  let successCount = 0;
  let skipCount = 0;

  for (const user of users) {
    try {
      // Check if user already has a welcome notification
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: 'WELCOME' as any,
        },
      });

      if (existing) {
        skipCount++;
        continue;
      }

      // Create welcome notification
      await prisma.notification.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          type: 'WELCOME' as any,
          title: WELCOME_NOTIFICATION.title,
          body: WELCOME_NOTIFICATION.body,
          metadata: {
            bodyEn: WELCOME_NOTIFICATION.bodyEn,
            sentAt: new Date().toISOString(),
          },
          read: false,
          createdAt: new Date(),
        },
      });

      successCount++;
      console.log(`✅ Sent to user: ${user.id.slice(0, 8)}... (${user.phoneNumber || 'no phone'})`);
    } catch (error) {
      console.error(`❌ Failed for user ${user.id}:`, error.message);
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Sent: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`   ❌ Failed: ${users.length - successCount - skipCount}`);
  console.log('────────────────────────────────────\n');

  await prisma.$disconnect();
}

sendWelcomeNotifications().catch(console.error);