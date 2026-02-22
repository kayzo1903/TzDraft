const fs = require('fs');
const path = require('path');

/**
 * Merge separated Prisma schema files into a single schema.prisma
 * This is necessary because Prisma doesn't support file imports yet
 */

const schemaDir = path.join(__dirname, '..', 'prisma', 'schema');
const outputFile = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Order matters! base.prisma must come first
const schemaFiles = [
  'base.prisma',
  'user.prisma',
  'game.prisma',
  'move.prisma',
  'clock.prisma',
];

console.log('🔄 Merging Prisma schemas...\n');

let mergedContent = '';
let addedHeader = false;

schemaFiles.forEach((file) => {
  const filePath = path.join(schemaDir, file);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Warning: ${file} not found, skipping...`);
    return;
  }

  console.log(`   Reading ${file}...`);
  let content = fs.readFileSync(filePath, 'utf8');

  // For base.prisma, keep everything
  if (file === 'base.prisma') {
    mergedContent += content + '\n\n';
    addedHeader = true;
  } else {
    // For other files, remove generator and datasource blocks
    // They should only be in base.prisma
    content = content
      .replace(/generator\s+\w+\s*{[^}]*}/gs, '')
      .replace(/datasource\s+\w+\s*{[^}]*}/gs, '')
      .trim();

    if (content) {
      mergedContent += content + '\n\n';
    }
  }
});

// Write the merged schema
fs.writeFileSync(outputFile, mergedContent.trim() + '\n');

console.log('\n✅ Successfully merged schemas into schema.prisma');
console.log(`📁 Output: ${outputFile}\n`);
console.log('Next steps:');
console.log('  1. npx prisma format');
console.log('  2. npx prisma generate');
console.log('  3. npx prisma migrate dev\n');
