#!/usr/bin/env node

/**
 * Database Connection Usage Diagnostic Tool
 * 
 * This script helps identify why the application is using so many database connections.
 * It monitors connection patterns, identifies leaks, and provides recommendations.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const http = require('http');
const https = require('https');

async function diagnoseConnectionUsage() {
  console.log('🔍 Database Connection Usage Diagnostic\n');
  
  // Create a test pool to check current settings
  const testPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5, // Small test pool
  });

  try {
    // Check current PostgreSQL settings
    const client = await testPool.connect();
    
    console.log('📊 Current Configuration:');
    console.log(`  DATABASE_MAX_CONNECTIONS: ${process.env.DATABASE_MAX_CONNECTIONS || '20'}`);
    console.log(`  DATABASE_IDLE_TIMEOUT: ${process.env.DATABASE_IDLE_TIMEOUT || '30000'}ms`);
    console.log(`  PROCESSOR_INTERVAL_MS: ${process.env.PROCESSOR_INTERVAL_MS || '5000'}ms`);
    console.log(`  MAX_CONCURRENT_PROCESSORS: ${process.env.MAX_CONCURRENT_PROCESSORS || '3'}`);
    console.log('');

    // Get PostgreSQL max connections
    const maxConnResult = await client.query("SHOW max_connections");
    console.log(`  PostgreSQL max_connections: ${maxConnResult.rows[0].max_connections}`);
    console.log('');

    // Get current active connections
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

    // Get connection details by application
    const appConnResult = await client.query(`
      SELECT 
        application_name,
        COUNT(*) as connection_count,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_count,
        MAX(backend_start) as oldest_connection,
        MIN(backend_start) as newest_connection
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY application_name
      ORDER BY connection_count DESC
    `);

    console.log('📱 Connections by Application:');
    appConnResult.rows.forEach(row => {
      console.log(`  ${row.application_name || 'Unknown'}:`);
      console.log(`    Total: ${row.connection_count}, Active: ${row.active_count}, Idle: ${row.idle_count}`);
      console.log(`    Oldest: ${row.oldest_connection}, Newest: ${row.newest_connection}`);
      console.log('');
    });

    // Check for long-running queries
    const longQueriesResult = await client.query(`
      SELECT 
        pid,
        application_name,
        state,
        query_start,
        state_change,
        query
      FROM pg_stat_activity 
      WHERE state != 'idle' 
      AND query_start < NOW() - INTERVAL '30 seconds'
      AND pid != pg_backend_pid()
      ORDER BY query_start ASC
    `);

    if (longQueriesResult.rows.length > 0) {
      console.log('⏰ Long-Running Queries (>30s):');
      longQueriesResult.rows.forEach(row => {
        console.log(`  PID ${row.pid} (${row.application_name}):`);
        console.log(`    State: ${row.state}, Started: ${row.query_start}`);
        console.log(`    Query: ${row.query ? row.query.substring(0, 100) + '...' : 'N/A'}`);
        console.log('');
      });
    }

    // Check for idle in transaction connections
    const idleInTxResult = await client.query(`
      SELECT 
        pid,
        application_name,
        state_change,
        query
      FROM pg_stat_activity 
      WHERE state = 'idle in transaction'
      AND state_change < NOW() - INTERVAL '60 seconds'
      ORDER BY state_change ASC
    `);

    if (idleInTxResult.rows.length > 0) {
      console.log('⚠️  Idle in Transaction Connections (>60s):');
      idleInTxResult.rows.forEach(row => {
        console.log(`  PID ${row.pid} (${row.application_name}):`);
        console.log(`    Idle since: ${row.state_change}`);
        console.log(`    Last query: ${row.query ? row.query.substring(0, 100) + '...' : 'N/A'}`);
        console.log('');
      });
    }

    client.release();

  } catch (error) {
    console.error('❌ Error getting connection info:', error.message);
  } finally {
    await testPool.end();
  }

  // Monitor connection patterns
  console.log('🔄 Monitoring connection patterns for 2 minutes...\n');
  
  const monitorPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5,
  });

  const startTime = Date.now();
  let connectionCounts = [];
  let peakConnections = 0;

  const interval = setInterval(async () => {
    try {
      const client = await monitorPool.connect();
      const result = await client.query(`
        SELECT COUNT(*) as total_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      const count = parseInt(result.rows[0].total_connections);
      connectionCounts.push(count);
      peakConnections = Math.max(peakConnections, count);
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`[${elapsed}s] Connections: ${count}`);
      
      if (count > 15) {
        console.log(`  ⚠️  High connection usage: ${count}`);
      }
      
      client.release();
      
    } catch (error) {
      console.error('Error monitoring:', error.message);
    }
  }, 5000);

  // Stop monitoring after 2 minutes
  setTimeout(() => {
    clearInterval(interval);
    monitorPool.end();
    
    console.log('\n📈 Connection Usage Summary:');
    console.log(`  Peak Connections: ${peakConnections}`);
    console.log(`  Average Connections: ${Math.round(connectionCounts.reduce((a, b) => a + b, 0) / connectionCounts.length)}`);
    console.log(`  Sample Count: ${connectionCounts.length}`);
    console.log('');

    // Provide recommendations
    console.log('💡 Recommendations:');
    
    if (peakConnections > 15) {
      console.log('  🚨 HIGH CONNECTION USAGE DETECTED');
      console.log('  - Check for connection leaks in SSE endpoints');
      console.log('  - Review upload queue processor connection management');
      console.log('  - Consider reducing SSE endpoint count');
      console.log('  - Implement connection pooling for background tasks');
    }
    
    if (peakConnections > 10) {
      console.log('  ⚠️  MODERATE CONNECTION USAGE');
      console.log('  - Monitor for connection leaks');
      console.log('  - Consider increasing DATABASE_MAX_CONNECTIONS if needed');
    }
    
    console.log('  ✅ Current settings should handle normal usage');
    console.log('');

    process.exit(0);
  }, 120000);

}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Diagnostic stopped by user');
  process.exit(0);
});

diagnoseConnectionUsage().catch(console.error);
