#!/usr/bin/env node

/**
 * Fix Stuck Queue - Direct Database Access
 * 
 * This script directly accesses the database to reset all stuck jobs
 * and fix the queue processing issue.
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

async function fixStuckQueue() {
  const pool = new Pool(config);
  
  try {
    console.log('🔧 Fix Stuck Queue - Direct Database Access');
    console.log('===========================================\n');

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

    // 2. Check stuck jobs
    console.log('⚠️  Stuck Jobs Analysis:');
    const stuckQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        EXTRACT(EPOCH FROM (NOW() - process_date))/3600 as hours_stuck,
        error,
        error_details
      FROM upload_queue 
      WHERE status = 'inprocess'
      ORDER BY process_date ASC
    `;
    const stuckResult = await pool.query(stuckQuery);
    
    if (stuckResult.rows.length === 0) {
      console.log('  ✅ No stuck jobs found');
    } else {
      console.log(`  🔴 Found ${stuckResult.rows.length} stuck jobs:`);
      stuckResult.rows.forEach(row => {
        const stuckTime = row.hours_stuck ? row.hours_stuck.toFixed(1) : 'unknown';
        console.log(`    - ${row.file_name} (stuck for ${stuckTime} hours)`);
        if (row.error) {
          console.log(`      Error: ${row.error}`);
        }
      });
    }
    console.log('');

    // 3. Check system settings
    console.log('⚙️  System Settings:');
    const settingsQuery = `
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `;
    const settingsResult = await pool.query(settingsQuery);
    
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    console.log(`  Max Concurrent Processors: ${settings.maxConcurrentProcessors || '5 (default)'}`);
    console.log(`  Webhook URL: ${settings.resumeProcessingWebhookUrl || 'Not configured'}`);
    console.log(`  Webhook Timeout: ${settings.resumeProcessingWebhookTimeout || '1800 (default 30 minutes)'} seconds`);
    console.log('');

    // 4. Ask for action
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('🔧 Available Actions:');
    console.log('  1. Reset ALL in-process jobs to queued status');
    console.log('  2. Reset only jobs stuck for more than 1 hour');
    console.log('  3. Reduce max concurrent processors to 1');
    console.log('  4. All of the above');
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
      console.log('\n🔄 Resetting ALL in-process jobs to queued status...');
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
      console.log('\n🔄 Resetting jobs stuck for more than 1 hour...');
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
      const updateSettingsQuery = `
        INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
        VALUES ('maxConcurrentProcessors', '1', NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = '1',
          "updatedAt" = NOW()
        RETURNING key, value
      `;
      
      const updateSettingsResult = await pool.query(updateSettingsQuery);
      console.log(`✅ Updated ${updateSettingsResult.rows[0].key} to ${updateSettingsResult.rows[0].value}`);
    }

    // 6. Show final status
    console.log('\n📊 Final Queue Status:');
    const finalStatusResult = await pool.query(statusQuery);
    
    finalStatusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });

    console.log('\n✅ Queue fix completed!');
    console.log('💡 Next steps:');
    console.log('  1. Check your webhook configuration');
    console.log('  2. Verify external service is accessible');
    console.log('  3. Try processing the queue again');
    console.log('  4. Monitor for any new stuck jobs');

  } catch (error) {
    console.error('❌ Failed to fix stuck queue:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
fixStuckQueue().catch(console.error);
