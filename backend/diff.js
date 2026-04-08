require('dotenv').config();
const { execSync } = require('child_process');

try {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_URL in .env");
  
  console.log("Generating diff...");
  const output = execSync(`npx prisma migrate diff --from-url "${url}" --to-schema-datamodel prisma/schema --script`, { encoding: 'utf-8' });
  
  require('fs').writeFileSync('migration_patch.sql', output);
  console.log("Diff written to migration_patch.sql");
} catch (err) {
  console.error(err.message || err);
}
