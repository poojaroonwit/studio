#!/usr/bin/env node

/**
 * Fix Upload Queue Performance Issues
 * This script applies database optimizations to prevent 504 Gateway Timeout errors
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixUploadQueuePerformance() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Upload Queue Performance Issues...\n');
    
    // 1. Check current table statistics
    console.log('📊 Current Table Statistics:');
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
    } else {
      console.log('   Table not found or no statistics available');
    }

    // 2. Create performance indexes
    console.log('\n🔧 Creating Performance Indexes...');
    
    const indexes = [
      {
        name: 'idx_upload_queue_upload_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_upload_queue_upload_date ON upload_queue (upload_date DESC)'
      },
      {
        name: 'idx_upload_queue_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON upload_queue (status)'
      },
      {
        name: 'idx_upload_queue_position_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_upload_queue_position_id ON upload_queue (position_id)'
      },
      {
        name: 'idx_upload_queue_status_upload_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_upload_queue_status_upload_date ON upload_queue (status, upload_date DESC)'
      },
      {
        name: 'idx_upload_queue_process_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_upload_queue_process_date ON upload_queue (process_date)'
      },
      {
        name: 'idx_upload_queue_created_by',
        sql: 'CREATE INDEX IF NOT EXISTS idx_upload_queue_created_by ON upload_queue (created_by)'
      }
    ];

    for (const index of indexes) {
      try {
        await client.query(index.sql);
        console.log(`   ✅ Created index: ${index.name}`);
      } catch (error) {
        console.log(`   ⚠️  Index ${index.name} already exists or failed: ${error.message}`);
      }
    }

    // 3. Try to create full-text search index (may fail if extension not available)
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_upload_queue_file_name 
        ON upload_queue USING gin (to_tsvector('english', file_name))
      `);
      console.log('   ✅ Created full-text search index for file_name');
    } catch (error) {
      console.log(`   ⚠️  Full-text search index not created: ${error.message}`);
    }

    // 4. Analyze the table to update statistics
    console.log('\n📈 Updating Table Statistics...');
    await client.query('ANALYZE upload_queue');
    console.log('   ✅ Table statistics updated');

    // 5. Check current queue status
    console.log('\n📊 Current Queue Status:');
    const queueStatus = await client.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status IN ('error', 'fail')) as failed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM upload_queue
    `);
    
    if (queueStatus.rows.length > 0) {
      const status = queueStatus.rows[0];
      console.log(`   - Total jobs: ${status.total_rows}`);
      console.log(`   - Queued: ${status.queued}`);
      console.log(`   - In Process: ${status.inprocess}`);
      console.log(`   - Success: ${status.success}`);
      console.log(`   - Failed: ${status.failed}`);
      console.log(`   - Cancelled: ${status.cancelled}`);
    }

    // 6. Check table size
    console.log('\n💾 Table Size Information:');
    const tableSize = await client.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('upload_queue')) as total_size,
        pg_size_pretty(pg_relation_size('upload_queue')) as table_size,
        pg_size_pretty(pg_total_relation_size('upload_queue') - pg_relation_size('upload_queue')) as index_size
    `);
    
    if (tableSize.rows.length > 0) {
      const size = tableSize.rows[0];
      console.log(`   - Total size: ${size.total_size}`);
      console.log(`   - Table size: ${size.table_size}`);
      console.log(`   - Index size: ${size.index_size}`);
    }

    // 7. Reset any stuck jobs
    console.log('\n🔄 Checking for Stuck Jobs...');
    const stuckJobs = await client.query(`
      UPDATE upload_queue 
      SET status = 'queued', 
          error = 'Reset due to performance optimization', 
          error_details = 'Job was reset during database performance optimization',
          updated_at = NOW()
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '30 minutes'
      RETURNING COUNT(*) as reset_count
    `);
    
    if (stuckJobs.rows.length > 0) {
      console.log(`   ✅ Reset ${stuckJobs.rows[0].reset_count} stuck jobs`);
    } else {
      console.log('   ✅ No stuck jobs found');
    }

    console.log('\n✅ Upload Queue Performance Optimization Complete!');
    console.log('\n📋 Recommendations:');
    console.log('   - Monitor query performance after these changes');
    console.log('   - Consider implementing pagination with smaller page sizes if issues persist');
    console.log('   - Set up regular VACUUM and ANALYZE maintenance');
    console.log('   - Monitor database connection pool settings');

  } catch (error) {
    console.error('❌ Error during performance optimization:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the optimization
fixUploadQueuePerformance()
  .then(() => {
    console.log('\n🎉 Performance optimization completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Performance optimization failed:', error);
    process.exit(1);
  });
