#!/usr/bin/env node

/**
 * Upload Queue Diagnostic Script
 * This script helps diagnose upload queue performance issues and 504 errors
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function diagnoseUploadQueue() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Upload Queue Diagnostic Report\n');
    
    // 1. Check if table exists and get basic info
    console.log('📊 Table Information:');
    const tableInfo = await client.query(`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      AND tablename = 'upload_queue'
    `);
    
    if (tableInfo.rows.length === 0) {
      console.log('   ❌ upload_queue table not found!');
      return;
    }
    
    const info = tableInfo.rows[0];
    console.log(`   - Total rows: ${info.live_rows}`);
    console.log(`   - Dead rows: ${info.dead_rows}`);
    console.log(`   - Inserts: ${info.inserts}`);
    console.log(`   - Updates: ${info.updates}`);
    console.log(`   - Deletes: ${info.deletes}`);
    console.log(`   - Last vacuum: ${info.last_vacuum || 'Never'}`);
    console.log(`   - Last analyze: ${info.last_analyze || 'Never'}`);
    
    // Check for potential issues
    if (info.dead_rows > info.live_rows * 0.1) {
      console.log('   ⚠️  High dead row ratio - table needs VACUUM');
    }
    if (!info.last_analyze) {
      console.log('   ⚠️  Table statistics never updated - needs ANALYZE');
    }

    // 2. Check current queue status
    console.log('\n📈 Queue Status:');
    const queueStatus = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM upload_queue 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    queueStatus.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} (${row.percentage}%)`);
    });

    // 3. Check for stuck jobs
    console.log('\n🔍 Stuck Jobs Analysis:');
    const stuckJobs = await client.query(`
      SELECT 
        COUNT(*) as stuck_count,
        MIN(process_date) as oldest_stuck,
        MAX(process_date) as newest_stuck
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '30 minutes'
    `);
    
    if (stuckJobs.rows[0].stuck_count > 0) {
      console.log(`   ⚠️  Found ${stuckJobs.rows[0].stuck_count} stuck jobs`);
      console.log(`   - Oldest stuck: ${stuckJobs.rows[0].oldest_stuck}`);
      console.log(`   - Newest stuck: ${stuckJobs.rows[0].newest_stuck}`);
    } else {
      console.log('   ✅ No stuck jobs found');
    }

    // 4. Check indexes
    console.log('\n🔧 Index Analysis:');
    const indexes = await client.query(`
      SELECT 
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      AND tablename = 'upload_queue'
      ORDER BY idx_scan DESC
    `);
    
    if (indexes.rows.length === 0) {
      console.log('   ❌ No indexes found - this is likely causing performance issues!');
    } else {
      indexes.rows.forEach(index => {
        console.log(`   - ${index.indexname}: ${index.index_scans} scans, ${index.index_size}`);
      });
    }

    // 5. Check table size
    console.log('\n💾 Table Size:');
    const tableSize = await client.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('upload_queue')) as total_size,
        pg_size_pretty(pg_relation_size('upload_queue')) as table_size,
        pg_size_pretty(pg_total_relation_size('upload_queue') - pg_relation_size('upload_queue')) as index_size
    `);
    
    const size = tableSize.rows[0];
    console.log(`   - Total size: ${size.total_size}`);
    console.log(`   - Table size: ${size.table_size}`);
    console.log(`   - Index size: ${size.index_size}`);

    // 6. Test query performance
    console.log('\n⚡ Performance Test:');
    const startTime = Date.now();
    try {
      const testQuery = await client.query(`
        SELECT COUNT(*) 
        FROM upload_queue 
        ORDER BY upload_date DESC 
        LIMIT 20
      `);
      const queryTime = Date.now() - startTime;
      console.log(`   - Simple query time: ${queryTime}ms`);
      
      if (queryTime > 5000) {
        console.log('   ⚠️  Query is slow - performance optimization needed');
      } else {
        console.log('   ✅ Query performance is acceptable');
      }
    } catch (error) {
      console.log(`   ❌ Query failed: ${error.message}`);
    }

    // 7. Check system settings
    console.log('\n⚙️  System Settings:');
    const settings = await client.query(`
      SELECT key, value 
      FROM "SystemSetting" 
      WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookTimeout')
      ORDER BY key
    `);
    
    if (settings.rows.length === 0) {
      console.log('   ⚠️  No relevant system settings found');
    } else {
      settings.rows.forEach(setting => {
        console.log(`   - ${setting.key}: ${setting.value}`);
      });
    }

    // 8. Recommendations
    console.log('\n📋 Recommendations:');
    
    if (info.dead_rows > info.live_rows * 0.1) {
      console.log('   🔧 Run VACUUM ANALYZE upload_queue');
    }
    
    if (!info.last_analyze) {
      console.log('   📊 Run ANALYZE upload_queue');
    }
    
    if (indexes.rows.length === 0) {
      console.log('   🏗️  Create database indexes for performance');
    }
    
    if (stuckJobs.rows[0].stuck_count > 0) {
      console.log('   🔄 Reset stuck jobs');
    }
    
    console.log('   📈 Monitor query performance regularly');
    console.log('   🗄️  Consider archiving old records');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection failed. Check:');
      console.log('   - DATABASE_URL environment variable');
      console.log('   - Database server status');
      console.log('   - Network connectivity');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the diagnostic
diagnoseUploadQueue()
  .then(() => {
    console.log('\n✅ Diagnostic completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Diagnostic failed:', error);
    process.exit(1);
  });
