#!/usr/bin/env node

/**
 * Fix Webhook Configuration
 * Updates the webhook token to a proper value
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixWebhookConfig() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Webhook Configuration...\n');
    
    // 1. Check current webhook settings
    console.log('📊 Current Webhook Settings:');
    const currentSettings = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `);
    
    currentSettings.rows.forEach(row => {
      console.log(`  ${row.key}: ${row.value || 'Not set'}`);
    });
    
    // 2. Check if we have a proper token in environment
    const envToken = process.env.RESUME_PROCESSING_WEBHOOK_TOKEN;
    console.log(`\n🔑 Environment Token: ${envToken ? 'Set' : 'Not set'}`);
    
    if (!envToken) {
      console.log('\n❌ ERROR: RESUME_PROCESSING_WEBHOOK_TOKEN not set in environment');
      console.log('Please set the correct webhook token in your .env.local file:');
      console.log('RESUME_PROCESSING_WEBHOOK_TOKEN=your-actual-token-here');
      return;
    }
    
    // 3. Update the webhook token
    console.log('\n🔧 Updating webhook token...');
    await client.query(`
      INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
      VALUES ('resumeProcessingWebhookToken', $1, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = $1,
        "updatedAt" = NOW()
    `, [envToken]);
    
    console.log('✅ Webhook token updated successfully');
    
    // 4. Reset failed jobs to retry
    console.log('\n🔄 Resetting failed jobs to retry...');
    const resetResult = await client.query(`
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        completed_date = NULL,
        error = NULL,
        error_details = NULL,
        updated_at = NOW()
      WHERE status = 'fail'
      RETURNING id, file_name
    `);
    
    console.log(`✅ Reset ${resetResult.rows.length} failed jobs to queued status`);
    resetResult.rows.forEach(row => {
      console.log(`  - ${row.file_name}`);
    });
    
    // 5. Check final status
    console.log('\n📈 Final Queue Status:');
    const finalStatus = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    finalStatus.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} jobs`);
    });
    
    console.log('\n🎉 Webhook configuration fixed!');
    console.log('\nNext steps:');
    console.log('1. The queue processor will now retry the failed jobs');
    console.log('2. Monitor the queue processing in the admin panel');
    console.log('3. Jobs should now process successfully with the correct token');
    
  } catch (error) {
    console.error('❌ Error fixing webhook configuration:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixWebhookConfig();
