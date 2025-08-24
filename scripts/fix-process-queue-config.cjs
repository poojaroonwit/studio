#!/usr/bin/env node

/**
 * Fix Process Queue Configuration
 * 
 * This script fixes the process queue configuration to allow multiple concurrent job processing.
 * It updates system settings and resets any stuck jobs.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Disable SSL for local development
});

async function fixProcessQueueConfig() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Process Queue Configuration...\n');
    
    // 1. Check current settings
    console.log('📊 Current System Settings:');
    const currentSettings = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `);
    
    if (currentSettings.rows.length === 0) {
      console.log('  No settings found - will create defaults');
    } else {
      currentSettings.rows.forEach(row => {
        console.log(`  ${row.key}: ${row.value}`);
      });
    }
    
    // 2. Update max concurrent processors to 5
    console.log('\n⚙️  Updating max concurrent processors to 5...');
    await client.query(`
      INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
      VALUES ('maxConcurrentProcessors', '5', NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = '5',
        "updatedAt" = NOW()
    `);
    
    // 3. Set webhook timeout to 30 minutes
    console.log('⏱️  Setting webhook timeout to 30 minutes...');
    await client.query(`
      INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
      VALUES ('resumeProcessingWebhookTimeout', '1800', NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = '1800',
        "updatedAt" = NOW()
    `);
    
    // 4. Check for stuck jobs
    console.log('\n🔍 Checking for stuck jobs...');
    const stuckJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'inprocess'
    `);
    
    const stuckCount = parseInt(stuckJobs.rows[0].count, 10);
    console.log(`  Found ${stuckCount} stuck jobs`);
    
    // 5. Reset stuck jobs if any
    if (stuckCount > 0) {
      console.log('🔄 Resetting stuck jobs to queued status...');
      const resetResult = await client.query(`
        UPDATE upload_queue 
        SET 
          status = 'queued',
          process_date = NULL,
          updated_at = NOW(),
          error = 'Reset due to configuration update',
          error_details = 'Jobs reset to allow proper concurrent processing'
        WHERE status = 'inprocess'
      `);
      console.log(`  Reset ${resetResult.rowCount} jobs`);
    }
    
    // 6. Check queue status
    console.log('\n📈 Current Queue Status:');
    const queueStatus = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    queueStatus.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    
    // 7. Verify final settings
    console.log('\n✅ Final System Settings:');
    const finalSettings = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `);
    
    finalSettings.rows.forEach(row => {
      console.log(`  ${row.key}: ${row.value}`);
    });
    
    console.log('\n🎉 Process Queue Configuration Fixed!');
    console.log('\nNext steps:');
    console.log('1. Restart the processor script if it\'s running');
    console.log('2. Monitor the queue processing in the admin panel');
    console.log('3. Check that multiple jobs are now processing concurrently');
    
  } catch (error) {
    console.error('❌ Error fixing process queue configuration:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixProcessQueueConfig().catch(console.error);
