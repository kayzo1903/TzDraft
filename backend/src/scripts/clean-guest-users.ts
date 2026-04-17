import { PrismaClient, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanGuestUsers() {
  console.log('🧹 Cleaning guest users...\n');

  // Find all guest users
  const guestUsers = await prisma.user.findMany({
    where: {
      accountType: AccountType.GUEST,
    },
    select: { id: true, username: true, createdAt: true },
  });

  console.log(`Found ${guestUsers.length} guest users\n`);

  if (guestUsers.length === 0) {
    console.log('No guest users to clean.');
    await prisma.$disconnect();
    return;
  }

  // Delete in order: dependent records first, then the user
  let deletedCount = 0;
  let failedCount = 0;

  for (const user of guestUsers) {
    try {
      // Delete related records (order matters due to foreign keys)
      await prisma.otpCode.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.rating.deleteMany({ where: { userId: user.id } });
      await prisma.matchmakingQueue.deleteMany({ where: { userId: user.id } });

      // Delete games where user is white or black player
      await prisma.move.deleteMany({
        where: {
          game: {
            OR: [{ whitePlayerId: user.id }, { blackPlayerId: user.id }],
          },
        },
      });
      await prisma.game.deleteMany({
        where: {
          OR: [{ whitePlayerId: user.id }, { blackPlayerId: user.id }],
        },
      });

      // Delete tournament participants
      await prisma.tournamentParticipant.deleteMany({
        where: { userId: user.id },
      });

      // Finally delete the user
      await prisma.user.delete({ where: { id: user.id } });

      deletedCount++;
      console.log(`✅ Deleted: ${user.username} (${user.id.slice(0, 8)}...)`);
    } catch (error) {
      failedCount++;
      console.log(`❌ Failed to delete ${user.username}: ${error.message}`);
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Deleted: ${deletedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log('────────────────────────────────────\n');

  await prisma.$disconnect();
}

cleanGuestUsers().catch(console.error);
