#!/usr/bin/env node

/**
 * Upload Queue Performance Monitoring Script
 * This script helps identify performance bottlenecks in the upload queue system
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function monitorUploadQueuePerformance() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Monitoring upload queue performance...\n');
    
    // 1. Check table statistics
    console.log('📊 Upload Queue Table Statistics:');
    const statsQuery = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        n_tup_hot_upd as hot_updates
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      AND tablename = 'upload_queue'
    `;
    
    const statsResult = await client.query(statsQuery);
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`   - Total rows: ${stats.live_rows}`);
      console.log(`   - Dead rows: ${stats.dead_rows}`);
      console.log(`   - Inserts: ${stats.inserts}`);
      console.log(`   - Updates: ${stats.updates}`);
      console.log(`   - Hot updates: ${stats.hot_updates}`);
    } else {
      console.log('   - Table not found or no statistics available');
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

    // 3. Test count query performance
    console.log('\n⚡ Testing Count Query Performance:');
    
    // Test the old inefficient approach (simulated)
    console.log('   Testing old approach (fetching all data)...');
    const oldStartTime = Date.now();
    const oldQuery = `
      SELECT uq.*, p.title as position_title 
      FROM upload_queue uq 
      LEFT JOIN "Position" p ON uq.position_id = p.id 
      ORDER BY uq.upload_date DESC 
      LIMIT 100
    `;
    const oldResult = await client.query(oldQuery);
    const oldTime = Date.now() - oldStartTime;
    console.log(`   - Old approach: ${oldTime}ms (fetched ${oldResult.rows.length} records)`);

    // Test the new optimized approach
    console.log('   Testing new optimized approach...');
    const newStartTime = Date.now();
    const newQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'error' OR status = 'fail') as error
      FROM upload_queue
    `;
    const newResult = await client.query(newQuery);
    const newTime = Date.now() - newStartTime;
    console.log(`   - New approach: ${newTime}ms (count only)`);

    // Calculate improvement
    const improvement = ((oldTime - newTime) / oldTime * 100).toFixed(1);
    console.log(`   - Performance improvement: ${improvement}%`);

    // 4. Check for missing indexes
    console.log('\n🔍 Checking for missing indexes...');
    const indexQuery = `
      SELECT 
        indexname,
        tablename,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      AND tablename = 'upload_queue'
      ORDER BY idx_scan DESC
    `;
    
    const indexResult = await client.query(indexQuery);
    if (indexResult.rows.length > 0) {
      console.log('   Found indexes:');
      indexResult.rows.forEach(row => {
        console.log(`   - ${row.indexname}: ${row.idx_scan} scans, ${row.idx_tup_read} tuples read`);
      });
    } else {
      console.log('   ⚠️  No indexes found - performance may be poor');
    }

    // 5. Check for slow queries
    console.log('\n🐌 Checking for slow queries...');
    const slowQueryCheck = `
      SELECT 
        query,
        mean_time,
        calls,
        total_time
      FROM pg_stat_statements 
      WHERE query LIKE '%upload_queue%'
      AND mean_time > 100
      ORDER BY mean_time DESC 
      LIMIT 5
    `;

    try {
      const slowQueryResult = await client.query(slowQueryCheck);
      if (slowQueryResult.rows.length > 0) {
        console.log('   Found slow queries:');
        slowQueryResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.mean_time.toFixed(2)}ms avg (${row.calls} calls)`);
          console.log(`      Query: ${row.query.substring(0, 100)}...`);
        });
      } else {
        console.log('   ✅ No slow queries found');
      }
    } catch (error) {
      console.log('   ℹ️  pg_stat_statements extension not available');
    }

    // 6. Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    const totalRows = statsResult.rows[0]?.live_rows || 0;
    
    if (totalRows > 1000) {
      console.log('   - Large upload queue detected (>1k items)');
      console.log('   - Consider implementing data archiving for old completed jobs');
      console.log('   - Monitor query performance regularly');
    }
    
    if (totalRows > 10000) {
      console.log('   - Very large upload queue detected (>10k items)');
      console.log('   - Consider database partitioning by date');
      console.log('   - Implement cleanup jobs for old records');
    }

    if (newTime > 100) {
      console.log('   - Count query is slow (>100ms)');
      console.log('   - Consider adding indexes on status column');
      console.log('   - Review query execution plan');
    }

    console.log('   - Use the optimized /api/upload-queue/count endpoint');
    console.log('   - Implement caching for count queries');
    console.log('   - Monitor real-time updates via SSE');

    // 7. Final assessment
    console.log('\n📋 Performance Assessment:');
    console.log(`   - Total upload queue items: ${totalRows}`);
    console.log(`   - Count query performance: ${newTime}ms`);
    console.log(`   - Performance improvement: ${improvement}%`);
    
    if (newTime < 50) {
      console.log('   - Status: 🟢 Excellent performance');
    } else if (newTime < 100) {
      console.log('   - Status: 🟡 Good performance');
    } else if (newTime < 500) {
      console.log('   - Status: 🟠 Acceptable performance');
    } else {
      console.log('   - Status: 🔴 Poor performance - optimization needed');
    }

  } catch (error) {
    console.error('❌ Error monitoring upload queue performance:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the monitoring script
if (require.main === module) {
  monitorUploadQueuePerformance()
    .then(() => {
      console.log('\n✨ Upload queue performance monitoring completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to monitor upload queue performance:', error);
      process.exit(1);
    });
}

module.exports = { monitorUploadQueuePerformance };
