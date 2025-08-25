#!/usr/bin/env node

/**
 * Quick Fix for Upload Queue Timeout Issues
 * This script provides immediate fixes for 504 Gateway Timeout errors
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function quickFixUploadQueue() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Quick Fix for Upload Queue Timeout Issues...\n');
    
    // 1. Reset stuck jobs
    console.log('🔄 Resetting stuck jobs...');
    const stuckJobs = await client.query(`
      UPDATE upload_queue 
      SET status = 'queued', 
          error = 'Reset due to timeout', 
          error_details = 'Job was reset due to processing timeout',
          updated_at = NOW()
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '30 minutes'
    `);
    
    console.log(`   ✅ Reset ${stuckJobs.rowCount} stuck jobs`);
    
    // 2. Create missing indexes if they don't exist
    console.log('🔧 Creating performance indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_queue_upload_date 
      ON upload_queue (upload_date DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_queue_status 
      ON upload_queue (status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_queue_position_id 
      ON upload_queue (position_id)
    `);
    
    console.log('   ✅ Performance indexes created/verified');
    
    // 3. Vacuum the table to clean up dead rows
    console.log('🧹 Cleaning up table...');
    await client.query('VACUUM ANALYZE upload_queue');
    console.log('   ✅ Table cleanup completed');
    
    // 4. Check current table stats
    console.log('📊 Current table statistics:');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status IN ('error', 'fail')) as failed
      FROM upload_queue
    `);
    
    const row = stats.rows[0];
    console.log(`   - Total rows: ${row.total_rows}`);
    console.log(`   - Queued: ${row.queued}`);
    console.log(`   - In Process: ${row.inprocess}`);
    console.log(`   - Success: ${row.success}`);
    console.log(`   - Failed: ${row.failed}`);
    
    // 5. Test query performance
    console.log('⚡ Testing query performance...');
    const startTime = Date.now();
    
    await client.query(`
      SELECT uq.*, p.title as position_title 
      FROM upload_queue uq 
      LEFT JOIN "Position" p ON uq.position_id = p.id 
      ORDER BY uq.upload_date DESC 
      LIMIT 1
    `);
    
    const queryTime = Date.now() - startTime;
    console.log(`   ✅ Test query completed in ${queryTime}ms`);
    
    if (queryTime > 5000) {
      console.log('   ⚠️  Query is still slow - consider additional optimizations');
    } else {
      console.log('   ✅ Query performance is acceptable');
    }
    
    console.log('\n✅ Quick fix completed! The upload queue should now work properly.');
    console.log('\n💡 Additional recommendations:');
    console.log('   1. Monitor the upload queue for the next few minutes');
    console.log('   2. If issues persist, run the full diagnostic script:');
    console.log('      node scripts/fix-upload-queue-timeout.js');
    console.log('   3. Consider archiving old completed jobs if the table is very large');

  } catch (error) {
    console.error('❌ Error during quick fix:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  quickFixUploadQueue().catch(console.error);
}

module.exports = { quickFixUploadQueue };
