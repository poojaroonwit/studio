#!/usr/bin/env node

/**
 * Upload Queue Timeout Fix Script
 * This script helps diagnose and fix 504 Gateway Timeout issues with the upload queue API
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixUploadQueueTimeout() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Upload Queue Timeout Issues...\n');
    
    // 1. Check table size and performance
    console.log('📊 Upload Queue Table Analysis:');
    const tableStats = await client.query(`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      AND tablename = 'upload_queue'
    `);
    
    if (tableStats.rows.length > 0) {
      const stats = tableStats.rows[0];
      console.log(`   - Total rows: ${stats.live_rows}`);
      console.log(`   - Dead rows: ${stats.dead_rows}`);
      console.log(`   - Inserts: ${stats.inserts}`);
      console.log(`   - Updates: ${stats.updates}`);
      console.log(`   - Deletes: ${stats.deletes}`);
      
      // Check if table needs vacuum
      if (stats.dead_rows > stats.live_rows * 0.1) {
        console.log('   ⚠️  High dead row ratio detected - table may need VACUUM');
      }
    }

    // 2. Check status distribution
    console.log('\n📈 Status Distribution:');
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM upload_queue 
      GROUP BY status 
      ORDER BY count DESC
    `;
    
    const statusResult = await client.query(statusQuery);
    statusResult.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} (${row.percentage}%)`);
    });

    // 3. Check for slow queries
    console.log('\n🐌 Slow Query Analysis:');
    const slowQueries = await client.query(`
      SELECT 
        query,
        mean_time,
        calls,
        total_time
      FROM pg_stat_statements 
      WHERE query LIKE '%upload_queue%'
      AND mean_time > 1000
      ORDER BY mean_time DESC 
      LIMIT 5
    `);
    
    if (slowQueries.rows.length > 0) {
      console.log('   Slow queries detected:');
      slowQueries.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Mean time: ${row.mean_time.toFixed(2)}ms, Calls: ${row.calls}`);
        console.log(`      Query: ${row.query.substring(0, 100)}...`);
      });
    } else {
      console.log('   ✅ No slow queries detected');
    }

    // 4. Check indexes
    console.log('\n🔍 Index Analysis:');
    const indexes = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'upload_queue'
      ORDER BY indexname
    `);
    
    console.log('   Current indexes:');
    indexes.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });

    // 5. Check for missing indexes
    console.log('\n🔧 Checking for missing indexes...');
    
    // Check if we have an index on upload_date (most important for ordering)
    const uploadDateIndex = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE tablename = 'upload_queue' 
      AND indexdef LIKE '%upload_date%'
    `);
    
    if (parseInt(uploadDateIndex.rows[0].count, 10) === 0) {
      console.log('   ⚠️  Missing index on upload_date - creating...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_upload_queue_upload_date 
        ON upload_queue (upload_date DESC)
      `);
      console.log('   ✅ Created index on upload_date');
    } else {
      console.log('   ✅ Index on upload_date exists');
    }

    // Check if we have an index on status
    const statusIndex = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE tablename = 'upload_queue' 
      AND indexdef LIKE '%status%'
    `);
    
    if (parseInt(statusIndex.rows[0].count, 10) === 0) {
      console.log('   ⚠️  Missing index on status - creating...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_upload_queue_status 
        ON upload_queue (status)
      `);
      console.log('   ✅ Created index on status');
    } else {
      console.log('   ✅ Index on status exists');
    }

    // 6. Check for stuck jobs
    console.log('\n🔍 Checking for stuck jobs...');
    const stuckJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'inprocess'
      AND process_date < NOW() - INTERVAL '1 hour'
    `);
    
    const stuckCount = parseInt(stuckJobs.rows[0].count, 10);
    if (stuckCount > 0) {
      console.log(`   ⚠️  Found ${stuckCount} stuck jobs (inprocess for >1 hour)`);
      console.log('   Consider resetting stuck jobs to queued status');
    } else {
      console.log('   ✅ No stuck jobs detected');
    }

    // 7. Clean up old completed jobs (optional)
    console.log('\n🧹 Cleanup Recommendations:');
    const oldJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status IN ('success', 'error', 'fail')
      AND completed_date < NOW() - INTERVAL '30 days'
    `);
    
    const oldCount = parseInt(oldJobs.rows[0].count, 10);
    if (oldCount > 1000) {
      console.log(`   📦 Found ${oldCount} old completed jobs (>30 days)`);
      console.log('   Consider archiving or deleting old jobs to improve performance');
    } else {
      console.log('   ✅ No excessive old jobs detected');
    }

    // 8. Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    console.log('   1. Ensure DATABASE_STATEMENT_TIMEOUT is set to 30000 (30s)');
    console.log('   2. Consider increasing DATABASE_MAX_CONNECTIONS if under load');
    console.log('   3. Monitor query performance with pg_stat_statements');
    console.log('   4. Run VACUUM ANALYZE upload_queue periodically');
    console.log('   5. Consider partitioning for very large tables');

    console.log('\n✅ Upload queue timeout analysis complete!');

  } catch (error) {
    console.error('❌ Error during upload queue analysis:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  fixUploadQueueTimeout().catch(console.error);
}

module.exports = { fixUploadQueueTimeout };
