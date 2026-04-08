import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Tournament Table Columns ---');
  const columns: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tournaments'
  `;
  console.table(columns);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
