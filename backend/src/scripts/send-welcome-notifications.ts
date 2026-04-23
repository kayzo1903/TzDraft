import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const WELCOME_NOTIFICATION = {
  title: 'Welcome to TzDraft!',
  body: 'Cheza Drafti mtandaoni na wapezaji wa Tanzania. Jiunge na ligi, pambana na AI, au mualike rafiki!',
  bodyEn:
    'Play Drafti online with players from Tanzania. Join leagues, compete against AI, or invite friends!',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

async function sendWelcomeNotifications() {
  console.log(
    '🔔 Sending welcome notifications to all users (DB + Push + WS)...\n',
  );

  // Get all users with their push tokens
  const users = await prisma.user.findMany({
    select: { id: true, phoneNumber: true, username: true, pushToken: true },
  });

  console.log(`Found ${users.length} total users\n`);

  let successCount = 0;
  let pushTokenCount = 0;
  let skipCount = 0;

  const pushMessages: any[] = [];
  const force = process.argv.includes('--force');

  for (const user of users) {
    try {
      if (!force) {
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
      }

      // 1. Create welcome notification in DB
      const notificationId = randomUUID();
      await prisma.notification.create({
        data: {
          id: notificationId,
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

      // 2. Prepare Push Notification if token exists
      if (user.pushToken) {
        pushMessages.push({
          to: user.pushToken,
          title: WELCOME_NOTIFICATION.title,
          body: WELCOME_NOTIFICATION.body,
          data: { type: 'WELCOME', screen: 'home' },
          sound: 'default',
          channelId: 'default',
          priority: 'high',
        });
        pushTokenCount++;
      }

      successCount++;
      console.log(
        `✅ DB Notification created for: ${user.username || user.id.slice(0, 8)}... (${user.pushToken ? 'Push ready' : 'No token'})`,
      );
    } catch (error) {
      console.error(`❌ Failed for user ${user.id}:`, error.message);
    }
  }

  // 3. Broadcast Push Notifications in chunks
  if (pushMessages.length > 0) {
    console.log(
      `\n🚀 Sending ${pushMessages.length} Push Notifications via Expo...`,
    );
    for (let i = 0; i < pushMessages.length; i += CHUNK_SIZE) {
      const chunk = pushMessages.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        if (res.ok) {
          console.log(
            `   - Chunk ${Math.floor(i / CHUNK_SIZE) + 1} sent successfully.`,
          );
        } else {
          console.error(
            `   - Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed:`,
            await res.text(),
          );
        }
      } catch (err) {
        console.error(`   - Chunk error:`, err.message);
      }
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`📊 Summary:`);
  console.log(`   ✅ DB Records: ${successCount}`);
  console.log(`   🚀 Push Sent: ${pushTokenCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Failed: ${users.length - successCount - skipCount}`);
  console.log('────────────────────────────────────\n');

  await prisma.$disconnect();
}

sendWelcomeNotifications().catch(console.error);
