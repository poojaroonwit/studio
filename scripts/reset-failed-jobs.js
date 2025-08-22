#!/usr/bin/env node

/**
 * Reset Failed Jobs - Retry Processing
 * 
 * This script resets failed jobs back to queued status
 * so they can be retried without webhook dependency.
 */

const { Pool } = require('pg');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Configuration - use DATABASE_URL from environment
const config = {
  connectionString: process.env.DATABASE_URL,
};

async function resetFailedJobs() {
  const pool = new Pool(config);
  
  try {
    console.log('🔄 Reset Failed Jobs');
    console.log('===================\n');

    // 1. Check current queue status
    console.log('📊 Current Queue Status:');
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `;
    const statusResult = await pool.query(statusQuery);
    
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    console.log('');

    // 2. Check failed jobs
    console.log('⚠️  Failed Jobs Analysis:');
    const failedQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        completed_date,
        error,
        error_details
      FROM upload_queue 
      WHERE status = 'fail'
      ORDER BY completed_date DESC
    `;
    const failedResult = await pool.query(failedQuery);
    
    if (failedResult.rows.length === 0) {
      console.log('  ✅ No failed jobs found');
      return;
    }

    console.log(`  ❌ Found ${failedResult.rows.length} failed jobs:`);
    failedResult.rows.forEach(row => {
      console.log(`    - ${row.file_name} (ID: ${row.id})`);
      if (row.error) {
        console.log(`      Error: ${row.error}`);
      }
    });
    console.log('');

    // 3. Reset failed jobs to queued status
    console.log('🔄 Resetting failed jobs to queued status...');
    const resetQuery = `
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        completed_date = NULL,
        updated_at = NOW(),
        error = 'Reset for retry - webhook disabled',
        error_details = 'Job was reset to allow retry without webhook dependency'
      WHERE status = 'fail'
      RETURNING id, file_name
    `;
    
    const resetResult = await pool.query(resetQuery);
    console.log(`✅ Reset ${resetResult.rows.length} failed jobs to queued status`);

    // 4. Show updated status
    console.log('\n📊 Updated Queue Status:');
    const updatedStatusResult = await pool.query(statusQuery);
    
    updatedStatusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });

    console.log('\n✅ Failed jobs have been reset and are ready for retry!');
    console.log('📝 You can now process the queue normally without webhook dependency');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
resetFailedJobs().catch(console.error);
