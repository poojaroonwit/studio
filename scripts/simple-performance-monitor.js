#!/usr/bin/env node

/**
 * Simple Performance Monitoring Script
 * Monitors database performance without requiring pg_stat_statements extension
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function simplePerformanceMonitor() {
  console.log('🔍 Simple Performance Monitoring Report');
  console.log('======================================\n');

  try {
    // 1. Check index usage statistics
    console.log('📈 Index Usage Statistics:');
    const indexStats = await pool.query(`
      SELECT 
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
          WHEN idx_scan = 0 THEN 'UNUSED'
          WHEN idx_scan < 10 THEN 'LOW_USAGE'
          ELSE 'ACTIVE'
        END as usage_status
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `);

    const unusedIndexes = indexStats.rows.filter(row => row.usage_status === 'UNUSED');
    const lowUsageIndexes = indexStats.rows.filter(row => row.usage_status === 'LOW_USAGE');
    const activeIndexes = indexStats.rows.filter(row => row.usage_status === 'ACTIVE');

    console.log(`Active Indexes: ${activeIndexes.length}`);
    console.log(`Low Usage Indexes: ${lowUsageIndexes.length}`);
    console.log(`Unused Indexes: ${unusedIndexes.length}`);

    if (unusedIndexes.length > 0) {
      console.log('\n⚠️  Unused Indexes (consider removing):');
      unusedIndexes.forEach(index => {
        console.log(`   - ${index.tablename}.${index.indexname}`);
      });
    }

    // 2. Check table statistics
    console.log('\n🗄️  Table Statistics:');
    const tableStats = await pool.query(`
      SELECT 
        schemaname,
        relname as tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `);

    tableStats.rows.forEach(table => {
      console.log(`${table.tablename}:`);
      console.log(`   Live Rows: ${table.live_rows.toLocaleString()}`);
      console.log(`   Dead Rows: ${table.dead_rows.toLocaleString()}`);
      console.log(`   Inserts: ${table.inserts.toLocaleString()}`);
      console.log(`   Updates: ${table.updates.toLocaleString()}`);
      console.log(`   Deletes: ${table.deletes.toLocaleString()}`);
      
      if (table.dead_rows > table.live_rows * 0.1) {
        console.log(`   ⚠️  High dead row ratio - consider VACUUM`);
      }
    });

    // 3. Check connection pool status
    console.log('\n🔧 Connection Pool Status:');
    console.log(`Total Connections: ${pool.totalCount}`);
    console.log(`Idle Connections: ${pool.idleCount}`);
    console.log(`Waiting Connections: ${pool.waitingCount}`);

    // 4. Check for long-running transactions
    console.log('\n⏱️  Long-running Transactions:');
    const longTransactions = await pool.query(`
      SELECT 
        pid,
        now() - pg_stat_activity.query_start AS duration,
        query
      FROM pg_stat_activity 
      WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
      AND state = 'active'
    `);

    if (longTransactions.rows.length > 0) {
      console.log('⚠️  Long-running transactions detected:');
      longTransactions.rows.forEach(tx => {
        console.log(`   PID ${tx.pid}: ${tx.duration} - ${tx.query.substring(0, 100)}...`);
      });
    } else {
      console.log('✅ No long-running transactions');
    }

    // 5. Check for locks
    console.log('\n🔒 Database Locks:');
    const locks = await pool.query(`
      SELECT 
        l.pid,
        l.mode,
        l.granted,
        t.relname as table_name,
        a.query
      FROM pg_locks l
      JOIN pg_class t ON l.relation = t.oid
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE t.relname NOT LIKE 'pg_%'
      AND l.mode != 'AccessShareLock'
    `);

    if (locks.rows.length > 0) {
      console.log('⚠️  Active locks detected:');
      locks.rows.forEach(lock => {
        console.log(`   PID ${lock.pid}: ${lock.mode} on ${lock.table_name} (${lock.granted ? 'granted' : 'waiting'})`);
      });
    } else {
      console.log('✅ No problematic locks detected');
    }

    // 6. Test query performance
    console.log('\n⚡ Query Performance Test:');
    
    // Test positions query
    const startTime = Date.now();
    const positionsTest = await pool.query(`
      SELECT COUNT(*) FROM "Position"
    `);
    const positionsTime = Date.now() - startTime;
    console.log(`Positions count query: ${positionsTime}ms`);

    // Test headcount query
    const headcountStart = Date.now();
    const headcountTest = await pool.query(`
      SELECT COUNT(*) FROM "Headcount"
    `);
    const headcountTime = Date.now() - headcountStart;
    console.log(`Headcount count query: ${headcountTime}ms`);

    // Test upload queue query
    const queueStart = Date.now();
    const queueTest = await pool.query(`
      SELECT COUNT(*) FROM upload_queue
    `);
    const queueTime = Date.now() - queueStart;
    console.log(`Upload queue count query: ${queueTime}ms`);

    // 7. Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    if (unusedIndexes.length > 5) {
      console.log('   - Consider removing unused indexes to improve write performance');
    }
    
    if (tableStats.rows.some(t => t.dead_rows > t.live_rows * 0.1)) {
      console.log('   - Run VACUUM on tables with high dead row ratios');
    }
    
    if (longTransactions.rows.length > 0) {
      console.log('   - Investigate long-running transactions');
    }

    if (positionsTime > 100) {
      console.log('   - Positions query is slow - check indexes');
    }

    if (headcountTime > 100) {
      console.log('   - Headcount query is slow - check indexes');
    }

    if (queueTime > 100) {
      console.log('   - Upload queue query is slow - check indexes');
    }

    console.log('\n✅ Performance monitoring complete');

  } catch (error) {
    console.error('❌ Error during performance monitoring:', error);
  } finally {
    await pool.end();
  }
}

// Run the monitoring
if (require.main === module) {
  simplePerformanceMonitor().catch(console.error);
}

module.exports = { simplePerformanceMonitor };
