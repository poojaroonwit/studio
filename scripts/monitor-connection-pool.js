#!/usr/bin/env node

/**
 * Database Connection Pool Monitor
 * 
 * This script monitors the database connection pool and provides early warnings
 * when the pool is approaching exhaustion or when there are connection leaks.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Configuration
const config = {
  checkIntervalMs: parseInt(process.env.CONNECTION_MONITOR_INTERVAL_MS) || 30000, // 30 seconds
  warningThreshold: parseFloat(process.env.CONNECTION_WARNING_THRESHOLD) || 0.8, // 80% of max connections
  criticalThreshold: parseFloat(process.env.CONNECTION_CRITICAL_THRESHOLD) || 0.95, // 95% of max connections
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 10,
  longRunningThresholdMs: parseInt(process.env.LONG_RUNNING_THRESHOLD_MS) || 30000, // 30 seconds
  logToFile: process.env.CONNECTION_MONITOR_LOG_FILE === 'true',
  logFilePath: process.env.CONNECTION_MONITOR_LOG_PATH || './logs/connection-pool.log'
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: config.maxConnections,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 1800000,
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT) || 30000,
  allowExitOnIdle: false,
});

// State tracking
let lastCheckTime = Date.now();
let consecutiveWarnings = 0;
let consecutiveCritical = 0;
let isRunning = true;

// Logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };
  
  console.log(JSON.stringify(logEntry));
  
  // Optionally log to file
  if (config.logToFile) {
    const fs = require('fs');
    const logDir = require('path').dirname(config.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(config.logFilePath, JSON.stringify(logEntry) + '\n');
  }
}

// Check connection pool status
async function checkConnectionPool() {
  try {
    const client = await pool.connect();
    
    try {
      // Get pool statistics
      const poolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        activeCount: pool.totalCount - pool.idleCount,
        utilization: (pool.totalCount - pool.idleCount) / config.maxConnections
      };
      
      // Check for long-running queries
      const longRunningQuery = await client.query(`
        SELECT 
          pid,
          now() - query_start AS duration,
          query,
          state
        FROM pg_stat_activity 
        WHERE state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
        AND (now() - query_start) > interval '${config.longRunningThresholdMs} milliseconds'
        ORDER BY duration DESC
        LIMIT 5
      `);
      
      // Check for idle connections that might be leaks
      const idleConnections = await client.query(`
        SELECT 
          pid,
          now() - state_change AS idle_duration,
          query,
          state
        FROM pg_stat_activity 
        WHERE state = 'idle'
        AND query NOT LIKE '%pg_stat_activity%'
        AND (now() - state_change) > interval '5 minutes'
        ORDER BY idle_duration DESC
        LIMIT 5
      `);
      
      // Check for locks
      const locks = await client.query(`
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
        ORDER BY l.pid
        LIMIT 10
      `);
      
      // Analyze and report
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTime;
      lastCheckTime = now;
      
      // Determine alert level
      let alertLevel = 'INFO';
      let alertMessage = 'Connection pool healthy';
      
      if (poolStats.utilization >= config.criticalThreshold) {
        alertLevel = 'CRITICAL';
        alertMessage = 'Connection pool critical - immediate action required';
        consecutiveCritical++;
        consecutiveWarnings = 0;
      } else if (poolStats.utilization >= config.warningThreshold) {
        alertLevel = 'WARNING';
        alertMessage = 'Connection pool utilization high';
        consecutiveWarnings++;
        consecutiveCritical = 0;
      } else {
        // Reset counters on healthy state
        consecutiveWarnings = 0;
        consecutiveCritical = 0;
      }
      
      // Log the status
      log(alertLevel, alertMessage, {
        poolStats,
        longRunningQueries: longRunningQuery.rows.length,
        idleConnections: idleConnections.rows.length,
        activeLocks: locks.rows.length,
        consecutiveWarnings,
        consecutiveCritical,
        timeSinceLastCheck,
        maxConnections: config.maxConnections,
        utilizationPercent: Math.round(poolStats.utilization * 100)
      });
      
      // Log details if there are issues
      if (longRunningQuery.rows.length > 0) {
        log('WARNING', 'Long-running queries detected', {
          queries: longRunningQuery.rows.map(row => ({
            pid: row.pid,
            duration: row.duration,
            query: row.query.substring(0, 100) + '...',
            state: row.state
          }))
        });
      }
      
      if (idleConnections.rows.length > 0) {
        log('WARNING', 'Idle connections detected', {
          connections: idleConnections.rows.map(row => ({
            pid: row.pid,
            idleDuration: row.idle_duration,
            query: row.query.substring(0, 100) + '...',
            state: row.state
          }))
        });
      }
      
      if (locks.rows.length > 0) {
        log('WARNING', 'Active locks detected', {
          locks: locks.rows.map(row => ({
            pid: row.pid,
            mode: row.mode,
            granted: row.granted,
            tableName: row.table_name,
            query: row.query.substring(0, 100) + '...'
          }))
        });
      }
      
      // Provide recommendations
      if (alertLevel === 'CRITICAL') {
        log('CRITICAL', 'Immediate actions recommended', {
          actions: [
            'Check for connection leaks in application code',
            'Review long-running queries',
            'Consider increasing DATABASE_MAX_CONNECTIONS',
            'Check for stuck transactions',
            'Restart application if necessary'
          ]
        });
      } else if (alertLevel === 'WARNING') {
        log('WARNING', 'Preventive actions recommended', {
          actions: [
            'Monitor connection usage patterns',
            'Review query performance',
            'Check for potential connection leaks',
            'Consider optimizing database queries'
          ]
        });
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    log('ERROR', 'Failed to check connection pool', {
      error: error.message,
      stack: error.stack
    });
  }
}

// Main monitoring loop
async function monitorLoop() {
  log('INFO', 'Connection pool monitor starting', {
    config: {
      checkIntervalMs: config.checkIntervalMs,
      warningThreshold: config.warningThreshold,
      criticalThreshold: config.criticalThreshold,
      maxConnections: config.maxConnections,
      longRunningThresholdMs: config.longRunningThresholdMs
    }
  });
  
  while (isRunning) {
    try {
      await checkConnectionPool();
      
      // Wait for next check
      await new Promise(resolve => setTimeout(resolve, config.checkIntervalMs));
    } catch (error) {
      log('ERROR', 'Error in monitoring loop', {
        error: error.message,
        stack: error.stack
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, config.checkIntervalMs));
    }
  }
}

// Graceful shutdown
function shutdown(signal) {
  log('INFO', `Received ${signal}, shutting down connection pool monitor`);
  isRunning = false;
  
  setTimeout(async () => {
    try {
      await pool.end();
      log('INFO', 'Connection pool monitor shutdown complete');
      process.exit(0);
    } catch (error) {
      log('ERROR', 'Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }, 2000);
}

// Signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Unhandled error handlers
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled rejection', { reason: reason?.message || reason, promise });
  shutdown('unhandledRejection');
});

// Start monitoring
monitorLoop().catch((error) => {
  log('ERROR', 'Fatal error in monitoring loop', { error: error.message, stack: error.stack });
  process.exit(1);
});
