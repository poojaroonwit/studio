#!/usr/bin/env node

/**
 * Reset Stuck Upload Queue Script
 * 
 * This script helps reset stuck jobs in the upload queue when the queue gets stuck.
 * It can be run manually or scheduled to run periodically.
 * 
 * Usage:
 *   node scripts/reset-stuck-queue.js
 *   node scripts/reset-stuck-queue.js --dry-run
 *   node scripts/reset-stuck-queue.js --reset-all-stuck
 */

const { Pool } = require('pg');

// Configuration
const STUCK_TIMEOUT_MINUTES = 30;
const DRY_RUN = process.argv.includes('--dry-run');
const RESET_ALL_STUCK = process.argv.includes('--reset-all-stuck');

async function resetStuckQueue() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  
  try {
    const client = await pool.connect();
    
    console.log('🔍 Checking upload queue status...');
    
    // Get current queue statistics
    const statsQuery = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\n📊 Current Queue Status:');
    statsQuery.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    
    // Check for stuck jobs
    const stuckQuery = await client.query(`
      SELECT 
        id,
        file_name,
        status,
        process_date,
        EXTRACT(EPOCH FROM (NOW() - process_date))/60 as minutes_stuck,
        error
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '${STUCK_TIMEOUT_MINUTES} minutes'
      ORDER BY process_date ASC
    `);
    
    if (stuckQuery.rows.length === 0) {
      console.log('\n✅ No stuck jobs found. Queue is healthy.');
      return;
    }
    
    console.log(`\n⚠️  Found ${stuckQuery.rows.length} stuck jobs:`);
    stuckQuery.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, File: ${row.file_name}, Stuck for: ${Math.round(row.minutes_stuck)} minutes`);
    });
    
    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN - No changes made. Use without --dry-run to reset stuck jobs.');
      return;
    }
    
    // Reset stuck jobs
    const resetQuery = await client.query(`
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        updated_at = NOW(),
        error = 'Reset due to timeout (stuck for >${STUCK_TIMEOUT_MINUTES} minutes)',
        error_details = CONCAT('Original error: ', COALESCE(error, 'None'), ' | Reset at: ', NOW())
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '${STUCK_TIMEOUT_MINUTES} minutes'
    `);
    
    console.log(`\n✅ Reset ${resetQuery.rowCount} stuck jobs back to 'queued' status.`);
    
    // Show final status
    const finalStatsQuery = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\n📊 Final Queue Status:');
    finalStatsQuery.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    
    // Check for failed jobs that could be manually retried
    const failedQuery = await client.query(`
      SELECT COUNT(*) as count 
      FROM upload_queue 
      WHERE status = 'failed'
    `);
    
    const failedCount = parseInt(failedQuery.rows[0].count, 10);
    if (failedCount > 0) {
      console.log(`\n💡 Note: ${failedCount} failed jobs exist. These can be manually retried by setting source to 'reprocess'.`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error resetting stuck queue:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
resetStuckQueue().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
