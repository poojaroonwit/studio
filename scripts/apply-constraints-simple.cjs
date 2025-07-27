#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Applying upload queue database constraints...');

try {
  // Check if the SQL file exists
  const sqlFile = 'scripts/add-upload-queue-concurrent-constraint.sql';
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ Error: SQL file not found:', sqlFile);
    process.exit(1);
  }

  // Read the SQL file
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('📝 SQL file loaded successfully');

  // Apply the SQL using Prisma db execute
  console.log('🚀 Applying constraints to database...');
  execSync('npx prisma db execute --stdin', {
    input: sql,
    stdio: 'inherit'
  });

  console.log('\n✅ Database constraints applied successfully!');
  console.log('\nThe upload queue now has:');
  console.log('  ✅ Database trigger to enforce concurrent limits');
  console.log('  ✅ Application-level protection');
  console.log('  ✅ Monitoring and violation detection');
  
  console.log('\nTo monitor the queue, run:');
  console.log('  node test-upload-queue-monitor.js');

} catch (error) {
  console.error('❌ Failed to apply constraints:', error.message);
  console.log('\nYou can apply the constraints manually using:');
  console.log('  npx prisma db execute --file scripts/add-upload-queue-concurrent-constraint.sql');
  process.exit(1);
} 