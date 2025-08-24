#!/usr/bin/env node

/**
 * Fix Stuck Upload Queue
 * 
 * This script fixes stuck jobs in the upload queue by:
 * 1. Resetting stuck jobs back to queued status
 * 2. Reducing max concurrent processors to prevent future issues
 * 3. Providing options for different fix strategies
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const readline = require('readline');

// Configuration - use DATABASE_URL from environment
const config = {
  connectionString: process.env.DATABASE_URL,
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function fixStuckQueue() {
  const pool = new Pool(config);
  
  try {
    console.log('Fix Stuck Upload Queue');
    console.log('========================\n');

    // 1. Check current queue status
    console.log('Current Queue Status:');
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

    // 2. Check stuck jobs
    console.log('⚠️  Stuck Jobs Analysis:');
    const stuckQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        CASE 
          WHEN process_date IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - process_date))/3600 
          ELSE NULL 
        END as hours_stuck,
        error,
        error_details
      FROM upload_queue 
      WHERE status = 'inprocess'
      ORDER BY process_date ASC
    `;
    const stuckResult = await pool.query(stuckQuery);
    
    if (stuckResult.rows.length === 0) {
      console.log('  ✅ No stuck jobs found - queue is healthy!');
      return;
    } else {
      console.log(`  ❌ Found ${stuckResult.rows.length} stuck jobs:`);
      stuckResult.rows.forEach(row => {
        const hoursStuck = row.hours_stuck ? parseFloat(row.hours_stuck).toFixed(1) : 'unknown';
        console.log(`    - ${row.file_name} (ID: ${row.id}) - Stuck for ${hoursStuck} hours`);
        if (row.error) {
          console.log(`      Error: ${row.error}`);
        }
      });
    }
    console.log('');

    // 3. Check system settings
    console.log('⚙️  Current System Settings:');
    const settingsQuery = `
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `;
    const settingsResult = await pool.query(settingsQuery);
    
    if (settingsResult.rows.length === 0) {
      console.log('  ⚠️  No relevant system settings found');
    } else {
      settingsResult.rows.forEach(row => {
        console.log(`  ${row.key}: ${row.value}`);
      });
    }
    console.log('');

    // 4. Present fix options
    console.log('Fix Options:');
    console.log('  1. Reset ALL in-process jobs to queued status');
    console.log('  2. Reset only jobs stuck for more than 1 hour');
    console.log('  3. Reduce max concurrent processors to 1');
    console.log('  4. Apply all fixes (recommended)');
    console.log('  5. Exit without changes');
    console.log('');

    const action = await new Promise((resolve) => {
      rl.question('Select action (1-5): ', resolve);
    });
    rl.close();

    if (action === '5') {
      console.log('❌ No changes made');
      return;
    }

    // 5. Execute selected actions
    if (action === '1' || action === '4') {
      console.log('\nResetting ALL in-process jobs to queued status...');
      const resetAllQuery = `
        UPDATE upload_queue 
        SET 
          status = 'queued',
          process_date = NULL,
          updated_at = NOW(),
          error = 'Reset due to queue stuck - will retry',
          error_details = 'All jobs were reset due to queue processing issue'
        WHERE status = 'inprocess'
        RETURNING id, file_name
      `;
      
      const resetAllResult = await pool.query(resetAllQuery);
      console.log(`✅ Reset ${resetAllResult.rows.length} jobs to queued status`);
    }

    if (action === '2') {
      console.log('\nResetting jobs stuck for more than 1 hour...');
      const resetStuckQuery = `
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
      
      const resetStuckResult = await pool.query(resetStuckQuery);
      console.log(`✅ Reset ${resetStuckResult.rows.length} stuck jobs to queued status`);
    }

    if (action === '3' || action === '4') {
      console.log('\n⚙️  Reducing max concurrent processors to 1...');
      const updateSettingQuery = `
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ('maxConcurrentProcessors', '1', NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = '1',
          "updatedAt" = NOW()
        RETURNING key, value
      `;
      
      const updateSettingResult = await pool.query(updateSettingQuery);
      console.log(`✅ Updated ${updateSettingResult.rows[0].key} to ${updateSettingResult.rows[0].value}`);
    }

    // 6. Verify the fix
    console.log('\nUpdated Queue Status:');
    const finalStatusResult = await pool.query(statusQuery);
    
    finalStatusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });

    console.log('\n✅ Queue fix completed successfully!');
    console.log('Consider:');
    console.log('  - Check your webhook service status');
    console.log('  - Verify webhook URL and authentication');
    console.log('  - Monitor queue processing for any new issues');

  } catch (error) {
    console.error('❌ Error fixing queue:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Make sure your database is running and DATABASE_URL is correct in .env.local');
    }
  } finally {
    await pool.end();
  }
}

fixStuckQueue();
