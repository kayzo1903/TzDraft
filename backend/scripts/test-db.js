const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection\n');
  console.log('================================\n');

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('📡 Attempting to connect to database...\n');

    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database!\n');

    // Test query
    console.log('🔍 Testing database query...');
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('✅ Query successful!\n');
    console.log('Database info:', result);

    // Check if tables exist
    console.log('\n🔍 Checking for existing tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    if (tables.length > 0) {
      console.log(`✅ Found ${tables.length} table(s):`);
      tables.forEach((t) => console.log(`   - ${t.table_name}`));
    } else {
      console.log('⚠️  No tables found. Run migrations to create tables.');
    }
  } catch (error) {
    console.error('❌ Database connection failed!\n');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Database credentials are incorrect');
    console.error('  2. Database server is not accessible');
    console.error('  3. Firewall blocking connection');
    console.error('  4. Database does not exist');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n================================');
    console.log('✅ Test completed!\n');
  }
}

testDatabaseConnection();
