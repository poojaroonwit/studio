#!/usr/bin/env node

/**
 * Fix Queued Jobs - Fix malformed webhook_payload
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixQueuedJobs() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Queued Jobs with malformed webhook_payload...\n');
    
    // 1. Check current queued jobs
    console.log('📊 Current Queued Jobs:');
    const queuedJobs = await client.query(`
      SELECT id, file_name, status, webhook_payload 
      FROM upload_queue 
      WHERE status = 'queued'
      ORDER BY upload_date ASC
    `);
    
    if (queuedJobs.rows.length === 0) {
      console.log('  No queued jobs found');
      return;
    }
    
    queuedJobs.rows.forEach(row => {
      console.log(`  ${row.file_name}: ${JSON.stringify(row.webhook_payload)}`);
    });
    
    // 2. Fix jobs with malformed webhook_payload
    console.log('\n🔧 Fixing malformed webhook_payload...');
    const fixResult = await client.query(`
      UPDATE upload_queue 
      SET 
        webhook_payload = '{"targetPositionId": null, "sourceId": null, "additionalAttachment": null}'::jsonb,
        updated_at = NOW()
      WHERE status = 'queued' 
      AND webhook_payload->>'error' IS NOT NULL
      RETURNING id, file_name
    `);
    
    console.log(`✅ Fixed ${fixResult.rows.length} jobs`);
    fixResult.rows.forEach(row => {
      console.log(`  - ${row.file_name}`);
    });
    
    // 3. Check final status
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
    
    console.log('\n🎉 Queued jobs fixed!');
    console.log('\nNext steps:');
    console.log('1. The queue processor should now be able to process these jobs');
    console.log('2. Monitor the queue processing in the admin panel');
    console.log('3. Check that jobs are being processed in FIFO order');
    
  } catch (error) {
    console.error('❌ Error fixing queued jobs:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixQueuedJobs();
