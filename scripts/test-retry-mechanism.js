#!/usr/bin/env node

/**
 * Test script to verify the upload queue retry mechanism
 * Run with: node scripts/test-retry-mechanism.js
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/studio9',
});

async function testRetryMechanism() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Upload Queue Retry Mechanism...\n');
    
    // 1. Check current failed jobs
    console.log('1. Checking current failed jobs...');
    const failedJobs = await client.query(`
      SELECT id, status, error, webhook_payload->>'retry_count' as retry_count, 
             webhook_payload->>'last_retry_attempt' as last_retry_attempt
      FROM upload_queue 
      WHERE status = 'failed'
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    console.log(`Found ${failedJobs.rowCount} failed jobs:`);
    failedJobs.rows.forEach(job => {
      console.log(`  - Job ${job.id}: retry_count=${job.retry_count || 0}, last_retry=${job.last_retry_attempt || 'never'}`);
    });
    
    // 2. Check jobs that can be retried
    console.log('\n2. Checking jobs that can be retried...');
    const retryableJobs = await client.query(`
      SELECT id, status, error, webhook_payload->>'retry_count' as retry_count
      FROM upload_queue 
      WHERE status = 'failed' 
      AND (
        webhook_payload->>'retry_count' IS NULL 
        OR (webhook_payload->>'retry_count')::int < 3
      )
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    console.log(`Found ${retryableJobs.rowCount} jobs that can be retried:`);
    retryableJobs.rows.forEach(job => {
      console.log(`  - Job ${job.id}: retry_count=${job.retry_count || 0}`);
    });
    
    // 3. Check jobs that have exceeded retry limit
    console.log('\n3. Checking jobs that have exceeded retry limit...');
    const exceededRetryJobs = await client.query(`
      SELECT id, status, error, webhook_payload->>'retry_count' as retry_count
      FROM upload_queue 
      WHERE status = 'failed' 
      AND webhook_payload->>'retry_count' IS NOT NULL
      AND (webhook_payload->>'retry_count')::int >= 3
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    console.log(`Found ${exceededRetryJobs.rowCount} jobs that have exceeded retry limit:`);
    exceededRetryJobs.rows.forEach(job => {
      console.log(`  - Job ${job.id}: retry_count=${job.retry_count}`);
    });
    
    // 4. Check current queue status
    console.log('\n4. Checking current queue status...');
    const queueStatus = await client.query(`
      SELECT status, COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('Current queue status:');
    queueStatus.rows.forEach(row => {
      console.log(`  - ${row.status}: ${row.count} jobs`);
    });
    
    // 5. Test manual retry for a failed job
    if (retryableJobs.rowCount > 0) {
      const testJob = retryableJobs.rows[0];
      console.log(`\n5. Testing manual retry for job ${testJob.id}...`);
      
      // Simulate the retry logic
      const currentRetryCount = parseInt(testJob.retry_count || 0);
      const newRetryCount = currentRetryCount + 1;
      
      console.log(`  Current retry count: ${currentRetryCount}`);
      console.log(`  New retry count: ${newRetryCount}`);
      
      if (newRetryCount < 3) {
        console.log(`  ✅ Job can be retried (${newRetryCount} < 3)`);
      } else {
        console.log(`  ❌ Job cannot be retried (${newRetryCount} >= 3)`);
      }
    }
    
    console.log('\n✅ Retry mechanism test completed!');
    
  } catch (error) {
    console.error('❌ Error testing retry mechanism:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testRetryMechanism().catch(console.error);
