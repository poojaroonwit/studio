const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 60000,
});

async function diagnoseNoProcessing() {
  const client = await pool.connect();
  try {
    console.log('🔍 Diagnosing Queue - No Jobs Processing...\n');
    
    // 1. Check overall queue status
    console.log('📊 Current Queue Status:');
    const statusQuery = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(upload_date) as oldest_job,
        MAX(upload_date) as newest_job
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    console.table(statusQuery.rows);
    
    // 2. Check for queued jobs that should be processing
    console.log('\n⏳ Queued Jobs (should be processing):');
    const queuedQuery = await client.query(`
      SELECT 
        id,
        file_name,
        upload_date,
        error,
        webhook_payload->>'retry_count' as retry_count
      FROM upload_queue 
      WHERE status = 'queued'
      ORDER BY upload_date ASC
      LIMIT 10
    `);
    
    if (queuedQuery.rows.length > 0) {
      console.table(queuedQuery.rows);
      console.log(`\n⚠️  Found ${queuedQuery.rows.length} queued jobs that should be processing!`);
    } else {
      console.log('✅ No queued jobs found');
    }
    
    // 3. Check for failed jobs that can be retried
    console.log('\n❌ Failed Jobs (can be retried):');
    const failedQuery = await client.query(`
      SELECT 
        id,
        file_name,
        error,
        upload_date,
        webhook_payload->>'retry_count' as retry_count
      FROM upload_queue 
      WHERE status = 'failed'
      AND (
        webhook_payload->>'retry_count' IS NULL 
        OR (webhook_payload->>'retry_count')::int < 3
      )
      ORDER BY upload_date DESC
      LIMIT 10
    `);
    
    if (failedQuery.rows.length > 0) {
      console.table(failedQuery.rows);
      console.log(`\n🔄 Found ${failedQuery.rows.length} failed jobs that can be retried`);
    } else {
      console.log('✅ No retryable failed jobs found');
    }
    
    // 4. Check for jobs with invalid file paths
    console.log('\n🚫 Jobs with Invalid File Paths:');
    const invalidQuery = await client.query(`
      SELECT 
        id,
        file_name,
        file_path,
        status,
        error
      FROM upload_queue 
      WHERE (file_path IS NULL OR file_path = '' OR file_path = 'null')
      AND status IN ('queued', 'inprocess')
      LIMIT 10
    `);
    
    if (invalidQuery.rows.length > 0) {
      console.table(invalidQuery.rows);
      console.log(`\n⚠️  Found ${invalidQuery.rows.length} jobs with invalid file paths`);
    } else {
      console.log('✅ No jobs with invalid file paths');
    }
    
    // 5. Check recent activity
    console.log('\n📈 Recent Activity (last 24 hours):');
    const recentQuery = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        MAX(upload_date) as latest_job
      FROM upload_queue 
      WHERE upload_date > NOW() - INTERVAL '24 hours'
      GROUP BY status
      ORDER BY status
    `);
    console.table(recentQuery.rows);
    
    // 6. Summary and recommendations
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    const totalQueued = statusQuery.rows.find(r => r.status === 'queued')?.count || 0;
    const totalFailed = statusQuery.rows.find(r => r.status === 'failed')?.count || 0;
    const totalInprocess = statusQuery.rows.find(r => r.status === 'inprocess')?.count || 0;
    
    if (totalInprocess === 0 && totalQueued > 0) {
      console.log('🚨 ISSUE: Queue has queued jobs but NO inprocess jobs');
      console.log('   This means the processor is not running or not picking up jobs');
      console.log('\n💡 SOLUTIONS:');
      console.log('   1. Check if processor service is running');
      console.log('   2. Verify PROCESSOR_API_KEY environment variable');
      console.log('   3. Check processor logs for errors');
      console.log('   4. Restart the application/processor service');
    } else if (totalQueued === 0 && totalFailed > 0) {
      console.log('⚠️  ISSUE: No queued jobs, but have failed jobs');
      console.log('   Consider retrying failed jobs or investigating failures');
    } else if (totalQueued === 0 && totalFailed === 0) {
      console.log('✅ Queue is empty - no issues detected');
    }
    
  } catch (error) {
    console.error('❌ Error diagnosing queue:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the diagnosis
diagnoseNoProcessing().catch(console.error);
