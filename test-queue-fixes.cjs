const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 60000,
});

async function testQueueFixes() {
  const client = await pool.connect();
  try {
    console.log('🧪 Testing Queue Logic Fixes...\n');
    
    // 1. Check current queue status
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
    
    // 2. Check system settings
    console.log('\n⚙️ System Settings:');
    const settingsQuery = await client.query(`
      SELECT key, value 
      FROM system_settings 
      WHERE key IN ('maxConcurrentProcessors', 'processorIntervalMs', 'processorBatchLimit')
      ORDER BY key
    `);
    console.table(settingsQuery.rows);
    
    // 3. Check for problematic jobs
    console.log('\n🔍 Problematic Jobs Analysis:');
    
    // Jobs with invalid file paths
    const invalidPathsQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE (file_path IS NULL OR file_path = '' OR file_path = 'null')
      AND status IN ('queued', 'inprocess')
    `);
    console.log(`Jobs with invalid file paths: ${invalidPathsQuery.rows[0].count}`);
    
    // Jobs stuck in inprocess
    const stuckQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '30 minutes'
    `);
    console.log(`Jobs stuck in inprocess (>30 min): ${stuckQuery.rows[0].count}`);
    
    // Jobs that can't be processed due to duplicate file paths
    const duplicateQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue uq1
      WHERE uq1.status = 'queued'
      AND uq1.file_path IS NOT NULL
      AND uq1.file_path != ''
      AND EXISTS (
        SELECT 1 FROM upload_queue uq2
        WHERE uq2.file_path = uq1.file_path
        AND uq2.status IN ('success', 'failed')
        AND uq2.id != uq1.id
      )
    `);
    console.log(`Queued jobs with duplicate file paths: ${duplicateQuery.rows[0].count}`);
    
    // 4. Test the improved job selection logic
    console.log('\n🎯 Testing Improved Job Selection Logic:');
    
    // Count jobs that would be selectable with old logic
    const oldLogicQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'queued' 
      AND file_path NOT IN (
        SELECT file_path FROM upload_queue 
        WHERE status IN ('success', 'failed')
        AND file_path IS NOT NULL
      )
    `);
    console.log(`Jobs selectable with OLD logic: ${oldLogicQuery.rows[0].count}`);
    
    // Count jobs that would be selectable with new logic (NO AUTOMATIC RETRY)
    const newLogicQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'queued' 
      AND (
        source = 'reprocess' 
        OR webhook_payload->>'source' = 'reprocess'
        OR (
          file_path NOT IN (
            SELECT file_path FROM upload_queue 
            WHERE status = 'success'
            AND file_path IS NOT NULL
            AND file_path != ''
          )
          AND file_path IS NOT NULL
          AND file_path != ''
        )
      )
    `);
    console.log(`Jobs selectable with NEW logic (NO RETRY): ${newLogicQuery.rows[0].count}`);
    
    // 5. Check database indexes
    console.log('\n📈 Database Indexes:');
    const indexesQuery = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'upload_queue'
      ORDER BY indexname
    `);
    console.log(`Found ${indexesQuery.rows.length} indexes on upload_queue table`);
    indexesQuery.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    
    // 6. Recommendations
    console.log('\n💡 Recommendations:');
    
    if (invalidPathsQuery.rows[0].count > 0) {
      console.log('  - Fix jobs with invalid file paths');
    }
    
    if (stuckQuery.rows[0].count > 0) {
      console.log('  - Reset stuck jobs');
    }
    
    if (duplicateQuery.rows[0].count > 0) {
      console.log('  - Review duplicate file path jobs');
    }
    
    const maxConcurrent = settingsQuery.rows.find(r => r.key === 'maxConcurrentProcessors')?.value;
    if (!maxConcurrent || parseInt(maxConcurrent) <= 0) {
      console.log('  - Fix maxConcurrentProcessors setting');
    }
    
    if (indexesQuery.rows.length < 5) {
      console.log('  - Add database indexes for better performance');
    }
    
    console.log('\n✅ Queue fixes test completed!');
    
  } catch (error) {
    console.error('❌ Error testing queue fixes:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testQueueFixes().catch(console.error);
