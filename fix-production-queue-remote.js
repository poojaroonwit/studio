#!/usr/bin/env node

/**
 * Fix Production Queue - Remote Execution
 * This script should be run on the production server
 */

// Load production environment variables
require('dotenv').config({ path: '.env.production' });

const { Pool } = require('pg');

async function fixProductionQueueRemote() {
  console.log('🔧 Fixing Production Queue (Remote Execution)...\n');
  
  // Use the production DATABASE_URL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('📊 Connecting to Production Database...');
    const client = await pool.connect();
    
    // 1. Check current status
    console.log('\n📈 Current Production Queue Status:');
    const statusResult = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    
    // 2. Reset stuck jobs
    console.log('\n🔄 Resetting stuck jobs...');
    const resetResult = await client.query(`
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        completed_date = NULL,
        updated_at = NOW(),
        error = 'Reset due to deployment - will retry',
        error_details = 'Jobs were reset during deployment and will be retried'
      WHERE status = 'inprocess'
      RETURNING id, file_name
    `);
    
    console.log(`✅ Reset ${resetResult.rows.length} stuck jobs to queued status`);
    
    // 3. Reset failed jobs
    console.log('\n🔄 Resetting failed jobs...');
    const failedResetResult = await client.query(`
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        completed_date = NULL,
        updated_at = NOW(),
        error = 'Reset for retry - deployment fix',
        error_details = 'Failed jobs reset for retry after deployment'
      WHERE status = 'fail'
      RETURNING id, file_name
    `);
    
    console.log(`✅ Reset ${failedResetResult.rows.length} failed jobs to queued status`);
    
    // 4. Check final status
    console.log('\n📈 Final Production Queue Status:');
    const finalStatusResult = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    finalStatusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    
    client.release();
    
    console.log('\n🎉 Production queue fixed!');
    console.log('\nNext steps:');
    console.log('1. Restart the production processor');
    console.log('2. Monitor the queue processing');
    console.log('3. Verify new jobs are being processed correctly');
    
  } catch (error) {
    console.error('❌ Error fixing production queue:', error.message);
  } finally {
    await pool.end();
  }
}

fixProductionQueueRemote();
