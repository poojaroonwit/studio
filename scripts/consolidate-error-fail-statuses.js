#!/usr/bin/env node

/**
 * Migration script to consolidate 'error' and 'fail' statuses to 'failed'
 * This script updates all upload_queue records and ensures consistency
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function consolidateErrorFailStatuses() {
  console.log('🔄 Starting consolidation of error and fail statuses to failed...');
  
  try {
    // Step 1: Update all 'error' statuses to 'failed'
    console.log('📝 Updating error statuses to failed...');
    const errorUpdateResult = await prisma.$executeRaw`
      UPDATE upload_queue 
      SET status = 'failed', updated_at = now() 
      WHERE status = 'error'
    `;
    console.log(`✅ Updated ${errorUpdateResult} records from 'error' to 'failed'`);

    // Step 2: Update all 'fail' statuses to 'failed'
    console.log('📝 Updating fail statuses to failed...');
    const failUpdateResult = await prisma.$executeRaw`
      UPDATE upload_queue 
      SET status = 'failed', updated_at = now() 
      WHERE status = 'fail'
    `;
    console.log(`✅ Updated ${failUpdateResult} records from 'fail' to 'failed'`);

    // Step 3: Verify the consolidation
    console.log('🔍 Verifying consolidation...');
    const statusCounts = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `;
    
    console.log('📊 Current status distribution:');
    statusCounts.forEach(({ status, count }) => {
      console.log(`   ${status}: ${count} records`);
    });

    // Step 4: Check for any remaining error/fail statuses
    const remainingErrorFail = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM upload_queue 
      WHERE status IN ('error', 'fail')
    `;
    
    if (remainingErrorFail[0].count === 0) {
      console.log('✅ Successfully consolidated all error and fail statuses to failed');
    } else {
      console.log(`⚠️  Warning: ${remainingErrorFail[0].count} records still have error/fail status`);
    }

    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
consolidateErrorFailStatuses()
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
