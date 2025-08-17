#!/usr/bin/env node

/**
 * Reset Stuck Jobs Script
 * 
 * This script resets jobs that are stuck in 'inprocess' status
 * to 'queued' status so they can be processed again.
 */

const { Pool } = require('pg');

// Configuration - update these values for your environment
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'studio8',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function resetStuckJobs() {
  const pool = new Pool(config);
  
  try {
    console.log('🔄 Reset Stuck Jobs Script');
    console.log('==========================\n');

    // Check for stuck jobs
    const stuckQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        EXTRACT(EPOCH FROM (NOW() - process_date))/3600 as hours_stuck
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '1 hour'
      ORDER BY process_date ASC
    `;
    
    const stuckResult = await pool.query(stuckQuery);
    
    if (stuckResult.rows.length === 0) {
      console.log('✅ No stuck jobs found to reset');
      return;
    }

    console.log(`Found ${stuckResult.rows.length} stuck jobs:`);
    stuckResult.rows.forEach(row => {
      console.log(`  - ${row.file_name} (stuck for ${row.hours_stuck.toFixed(1)} hours)`);
    });
    console.log('');

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Do you want to reset these jobs to "queued" status? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      return;
    }

    // Reset stuck jobs
    const resetQuery = `
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        updated_at = NOW(),
        error = 'Reset due to timeout - will retry',
        error_details = 'Job was stuck in processing and has been reset for retry'
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '1 hour'
      RETURNING id, file_name
    `;
    
    const resetResult = await pool.query(resetQuery);
    
    console.log(`✅ Successfully reset ${resetResult.rows.length} jobs:`);
    resetResult.rows.forEach(row => {
      console.log(`  - ${row.file_name} (ID: ${row.id})`);
    });
    
    console.log('\n🔄 Jobs are now back in the queue and will be processed again.');

  } catch (error) {
    console.error('❌ Failed to reset stuck jobs:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
resetStuckJobs().catch(console.error);
