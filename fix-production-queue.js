#!/usr/bin/env node

/**
 * Fix Production Queue
 * This script fixes stuck jobs in the production database
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Production database configuration
const productionConfig = {
  host: process.env.PRODUCTION_DB_HOST || '10.111.0.4',
  port: process.env.PRODUCTION_DB_PORT || 5432,
  database: process.env.PRODUCTION_DB_NAME || 'studio_production',
  user: process.env.PRODUCTION_DB_USER || 'postgres',
  password: process.env.PRODUCTION_DB_PASSWORD || 'secure_password',
};

async function fixProductionQueue() {
  console.log('🔧 Fixing Production Queue...\n');
  
  const pool = new Pool(productionConfig);
  
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
    
    // 3. Reset failed jobs (optional)
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
    
    // 5. Check system settings
    console.log('\n⚙️  Production System Settings:');
    const settingsResult = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken')
      ORDER BY key
    `);
    
    if (settingsResult.rows.length === 0) {
      console.log('  ⚠️  No system settings found');
    } else {
      settingsResult.rows.forEach(row => {
        console.log(`  ${row.key}: ${row.value || 'Not set'}`);
      });
    }
    
    client.release();
    
    console.log('\n🎉 Production queue fixed!');
    console.log('\nNext steps:');
    console.log('1. Restart the production processor');
    console.log('2. Monitor the queue processing');
    console.log('3. Verify new jobs are being processed correctly');
    
  } catch (error) {
    console.error('❌ Error fixing production queue:', error.message);
    console.log('\nPlease check your production database configuration:');
    console.log('- PRODUCTION_DB_HOST');
    console.log('- PRODUCTION_DB_PORT');
    console.log('- PRODUCTION_DB_NAME');
    console.log('- PRODUCTION_DB_USER');
    console.log('- PRODUCTION_DB_PASSWORD');
  } finally {
    await pool.end();
  }
}

fixProductionQueue();
