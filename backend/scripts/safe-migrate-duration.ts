import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 1: Adding round_duration_minutes column ---');
  try {
    await prisma.$executeRaw`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS round_duration_minutes INTEGER DEFAULT 10080;`;
    console.log('Column added or already exists.');
  } catch (err) {
    console.warn('Warning adding column:', err.message);
  }

  console.log('--- Step 2: Migrating data (days * 1440) ---');
  const count = await prisma.$executeRaw`
    UPDATE tournaments 
    SET round_duration_minutes = round_duration_days * 1440 
    WHERE round_duration_days IS NOT NULL;
  `;
  console.log(`Migrated ${count} records.`);

  console.log('--- Verification ---');
  const samples: any[] = await prisma.$queryRaw`
    SELECT id, name, round_duration_days, round_duration_minutes 
    FROM tournaments 
    LIMIT 5;
  `;
  console.table(samples);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
