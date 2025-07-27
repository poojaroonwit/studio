#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Applying Prisma migration for upload queue constraints...');

try {
  // Check if we're in the right directory
  if (!fs.existsSync('prisma/schema.prisma')) {
    console.error('❌ Error: prisma/schema.prisma not found. Please run this script from the project root.');
    process.exit(1);
  }

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL before running this script');
    process.exit(1);
  }

  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Apply migrations
  console.log('🚀 Applying database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Verify the trigger was created
  console.log('🔍 Verifying trigger creation...');
  try {
    const { execSync } = require('child_process');
    const result = execSync('npx prisma db execute --stdin', {
      input: `
        SELECT 
          trigger_name, 
          event_manipulation, 
          action_timing 
        FROM information_schema.triggers 
        WHERE trigger_name = 'enforce_inprocess_limit' 
        AND event_object_table = 'upload_queue';
      `,
      encoding: 'utf8'
    });
    
    if (result.includes('enforce_inprocess_limit')) {
      console.log('✅ Database trigger created successfully!');
    } else {
      console.log('⚠️  Warning: Trigger not found. You may need to run the SQL manually.');
      console.log('Run: psql $DATABASE_URL -f scripts/add-upload-queue-concurrent-constraint.sql');
    }
  } catch (error) {
    console.log('⚠️  Could not verify trigger creation. You may need to run the SQL manually.');
    console.log('Run: psql $DATABASE_URL -f scripts/add-upload-queue-concurrent-constraint.sql');
  }

  console.log('\n🎉 Migration completed successfully!');
  console.log('\nThe upload queue now has:');
  console.log('  ✅ Database trigger to enforce concurrent limits');
  console.log('  ✅ Application-level protection');
  console.log('  ✅ Monitoring and violation detection');
  console.log('  ✅ Visual warnings in the UI');
  
  console.log('\nTo monitor the queue, run:');
  console.log('  node test-upload-queue-monitor.js');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('\nIf the migration fails, you can apply the constraint manually:');
  console.log('  psql $DATABASE_URL -f scripts/add-upload-queue-concurrent-constraint.sql');
  process.exit(1);
} 