#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function debugConnections() {
  console.log('🔍 Connection Debug Script\n');
  
  try {
    // Check database connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5, // Small test pool
    });

    const client = await pool.connect();
    
    console.log('📊 Database Configuration:');
    console.log(`  DATABASE_MAX_CONNECTIONS: ${process.env.DATABASE_MAX_CONNECTIONS || '20'}`);
    console.log(`  DATABASE_IDLE_TIMEOUT: ${process.env.DATABASE_IDLE_TIMEOUT || '30000'}ms`);
    console.log('');

    // Get PostgreSQL max connections
    const maxConnResult = await client.query("SHOW max_connections");
    console.log(`  PostgreSQL max_connections: ${maxConnResult.rows[0].max_connections}`);
    console.log('');

    // Get current connection status
    const activeConnResult = await client.query(`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
        COUNT(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction,
        COUNT(CASE WHEN state = 'disabled' THEN 1 END) as disabled_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);

    const stats = activeConnResult.rows[0];
    console.log('🔗 Current Connection Status:');
    console.log(`  Total Connections: ${stats.total_connections}`);
    console.log(`  Active Connections: ${stats.active_connections}`);
    console.log(`  Idle Connections: ${stats.idle_connections}`);
    console.log(`  Idle in Transaction: ${stats.idle_in_transaction}`);
    console.log(`  Disabled Connections: ${stats.disabled_connections}`);
    console.log('');

    // Get connections by application
    const appConnResult = await client.query(`
      SELECT 
        COALESCE(application_name, 'Unknown') as application,
        COUNT(*) as total,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle,
        MIN(backend_start) as oldest,
        MAX(backend_start) as newest
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY application_name
      ORDER BY total DESC
    `);

    console.log('📱 Connections by Application:');
    for (const row of appConnResult.rows) {
      console.log(`  ${row.application}:`);
      console.log(`    Total: ${row.total}, Active: ${row.active}, Idle: ${row.idle}`);
      console.log(`    Oldest: ${new Date(row.oldest).toLocaleString()}, Newest: ${new Date(row.newest).toLocaleString()}`);
      console.log('');
    }

    // Get long-running queries
    const longQueryResult = await client.query(`
      SELECT 
        pid,
        application_name,
        state,
        query_start,
        EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds,
        LEFT(query, 100) as query_preview
      FROM pg_stat_activity 
      WHERE datname = current_database()
        AND state != 'idle'
        AND query_start < NOW() - INTERVAL '30 seconds'
      ORDER BY query_start ASC
    `);

    if (longQueryResult.rows.length > 0) {
      console.log('⚠️  Long-Running Queries (>30s):');
      for (const row of longQueryResult.rows) {
        console.log(`  PID ${row.pid} (${row.application_name}):`);
        console.log(`    State: ${row.state}, Duration: ${Math.round(row.duration_seconds)}s`);
        console.log(`    Started: ${new Date(row.query_start).toLocaleString()}`);
        console.log(`    Query: ${row.query_preview}...`);
        console.log('');
      }
    } else {
      console.log('✅ No long-running queries detected');
    }

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Error debugging connections:', error);
  }
}

// Run the debug function
debugConnections().catch(console.error);
