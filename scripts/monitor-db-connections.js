#!/usr/bin/env node

/**
 * Database Connection Monitor
 * 
 * This script monitors database connections and helps diagnose connection pool issues.
 * It shows active connections, idle connections, and connection pool statistics.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function monitorConnections() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔍 Monitoring database connections...\n');

    // Get connection pool stats
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    console.log('📊 Connection Pool Statistics:');
    console.log(`  Total Connections: ${poolStats.totalCount}`);
    console.log(`  Idle Connections: ${poolStats.idleCount}`);
    console.log(`  Waiting Connections: ${poolStats.waitingCount}`);
    console.log(`  Active Connections: ${poolStats.totalCount - poolStats.idleCount}`);
    console.log('');

    // Get active connections from PostgreSQL
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          client_hostname,
          state,
          state_change,
          query_start,
          wait_event_type,
          wait_event,
          query
        FROM pg_stat_activity 
        WHERE state != 'idle' 
        AND pid != pg_backend_pid()
        ORDER BY query_start DESC
      `);

      console.log('🔗 Active Database Connections:');
      if (result.rows.length === 0) {
        console.log('  No active connections found');
      } else {
        result.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. PID: ${row.pid}`);
          console.log(`     User: ${row.usename}`);
          console.log(`     Application: ${row.application_name || 'N/A'}`);
          console.log(`     State: ${row.state}`);
          console.log(`     Started: ${row.query_start}`);
          console.log(`     Query: ${row.query ? row.query.substring(0, 100) + '...' : 'N/A'}`);
          console.log('');
        });
      }

      // Get connection limits
      const limitsResult = await client.query(`
        SELECT name, setting, unit 
        FROM pg_settings 
        WHERE name IN ('max_connections', 'shared_preload_libraries')
      `);

      console.log('⚙️  PostgreSQL Settings:');
      limitsResult.rows.forEach(row => {
        console.log(`  ${row.name}: ${row.setting}${row.unit || ''}`);
      });

    } finally {
      client.release();
    }

    // Monitor for 60 seconds
    console.log('\n🔄 Monitoring for 60 seconds... (Press Ctrl+C to stop)');
    
    const interval = setInterval(async () => {
      const stats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      };
      
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Pool: ${stats.totalCount} total, ${stats.idleCount} idle, ${stats.waitingCount} waiting`);
      
      if (stats.waitingCount > 0) {
        console.log(`⚠️  WARNING: ${stats.waitingCount} connections waiting!`);
      }
      
      if (stats.totalCount >= 18) { // Near the 20 connection limit
        console.log(`🚨 ALERT: High connection usage: ${stats.totalCount}/20`);
      }
    }, 5000);

    // Stop monitoring after 60 seconds
    setTimeout(() => {
      clearInterval(interval);
      console.log('\n✅ Monitoring complete');
      process.exit(0);
    }, 60000);

  } catch (error) {
    console.error('❌ Error monitoring connections:', error);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Monitoring stopped by user');
  process.exit(0);
});

monitorConnections().catch(console.error);
