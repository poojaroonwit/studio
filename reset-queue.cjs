const { Pool } = require('pg');
const fs = require('fs');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 60000,
});

async function resetQueue() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting Upload Queue Reset...\n');
    
    // 1. Check current status
    console.log('📊 Current Queue Status:');
    const statusQuery = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    console.table(statusQuery.rows);
    
    // 2. Check for inprocess jobs
    const inprocessQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'inprocess'
    `);
    const inprocessCount = parseInt(inprocessQuery.rows[0].count);
    
    if (inprocessCount > 0) {
      console.log(`⚠️  Found ${inprocessCount} jobs stuck in 'inprocess' status`);
      
      // Reset inprocess jobs
      const resetResult = await client.query(`
        UPDATE upload_queue 
        SET 
          status = 'queued',
          process_date = NULL,
          updated_at = NOW(),
          error = 'Force reset - no jobs processing'
        WHERE status = 'inprocess'
      `);
      console.log(`✅ Reset ${resetResult.rowCount} stuck jobs to 'queued' status`);
    } else {
      console.log('✅ No jobs stuck in inprocess status');
    }
    
    // 3. Auto-retry failed jobs
    const retryResult = await client.query(`
      UPDATE upload_queue 
      SET 
        status = 'queued',
        process_date = NULL,
        updated_at = NOW(),
        error = NULL,
        error_details = NULL,
        completed_date = NULL
      WHERE status = 'failed' 
      AND (
        webhook_payload->>'retry_count' IS NULL 
        OR (webhook_payload->>'retry_count')::int < 3
      )
    `);
    console.log(`🔄 Auto-retried ${retryResult.rowCount} failed jobs`);
    
    // 4. Show final status
    console.log('\n📊 Final Queue Status:');
    const finalStatusQuery = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM upload_queue 
      GROUP BY status 
      ORDER BY status
    `);
    console.table(finalStatusQuery.rows);
    
    console.log('\n✅ Queue reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Error resetting queue:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the reset
resetQueue().catch(console.error);
