require('dotenv').config();

console.log('🔍 Environment Variables Test\n');
console.log('================================');

// Database
console.log('\n📊 Database Configuration:');
console.log(
  'DATABASE_URL:',
  process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
);
if (process.env.DATABASE_URL) {
  // Mask password for security
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@');
  console.log('  Value:', maskedUrl);
}

// JWT
console.log('\n🔐 JWT Configuration:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('JWT_EXPIRATION:', process.env.JWT_EXPIRATION || '❌ Not set');

// Server
console.log('\n🚀 Server Configuration:');
console.log('PORT:', process.env.PORT || '3000 (default)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development (default)');

// CAKE Engine
console.log('\n🤖 CAKE Engine Configuration:');
console.log('CAKE_ENGINE_PATH:', process.env.CAKE_ENGINE_PATH || '❌ Not set');
console.log(
  'CAKE_ENGINE_TIMEOUT:',
  process.env.CAKE_ENGINE_TIMEOUT || '❌ Not set',
);

// CORS
console.log('\n🌐 CORS Configuration:');
console.log(
  'CORS_ORIGIN:',
  process.env.CORS_ORIGIN || 'http://localhost:3001 (default)',
);

console.log('\n================================');
console.log('✅ Environment variables loaded successfully!\n');
