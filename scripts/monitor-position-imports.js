#!/usr/bin/env node

/**
 * Position Import Performance Monitor
 * 
 * This script monitors position import operations to detect:
 * - Long-running imports
 * - Database connection pool exhaustion
 * - Memory leaks
 * - Performance degradation
 * - Resource usage patterns
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  checkIntervalMs: parseInt(process.env.POSITION_IMPORT_MONITOR_INTERVAL_MS) || 10000, // 10 seconds
  longRunningThresholdMs: parseInt(process.env.POSITION_IMPORT_LONG_RUNNING_THRESHOLD_MS) || 60000, // 1 minute
  memoryThresholdMB: parseInt(process.env.POSITION_IMPORT_MEMORY_THRESHOLD_MB) || 100, // 100MB
  connectionWarningThreshold: parseFloat(process.env.POSITION_IMPORT_CONNECTION_WARNING_THRESHOLD) || 0.8, // 80%
  logToFile: process.env.POSITION_IMPORT_MONITOR_LOG_FILE === 'true',
  logFilePath: process.env.POSITION_IMPORT_MONITOR_LOG_PATH || './logs/position-import-monitor.log',
  alertWebhook: process.env.POSITION_IMPORT_ALERT_WEBHOOK,
  maxImportTimeMs: parseInt(process.env.POSITION_IMPORT_MAX_TIME_MS) || 300000, // 5 minutes
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 10,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 1800000,
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT) || 30000,
  allowExitOnIdle: false,
});

// State tracking
let lastCheckTime = Date.now();
let consecutiveWarnings = 0;
let consecutiveErrors = 0;
let isRunning = true;
let activeImports = new Map(); // Track active import operations

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
    const logDir = path.dirname(config.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(config.logFilePath, JSON.stringify(logEntry) + '\n');
  }
}

// Send alert via webhook
async function sendAlert(level, message, data = {}) {
  if (!config.alertWebhook) return;
  
  try {
    const response = await fetch(config.alertWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        data
      })
    });
    
    if (!response.ok) {
      console.error(`Failed to send alert: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending alert:', error.message);
  }
}

// Check for long-running position imports
async function checkLongRunningImports() {
  try {
    const client = await pool.connect();
    
    // Check for imports that have been running too long
    const longRunningQuery = `
      SELECT 
        id,
        file_name,
        status,
        upload_date,
        process_date,
        completed_date,
        EXTRACT(EPOCH FROM (NOW() - upload_date)) * 1000 as duration_ms
      FROM upload_queue 
      WHERE source = 'position_import' 
        AND status IN ('uploading', 'processing')
        AND upload_date < NOW() - INTERVAL '${config.longRunningThresholdMs} milliseconds'
      ORDER BY upload_date ASC
    `;
    
    const longRunningResult = await client.query(longRunningQuery);
    
    if (longRunningResult.rows.length > 0) {
      const longRunningImports = longRunningResult.rows;
      
      log('WARNING', 'Long-running position imports detected', {
        count: longRunningImports.length,
        imports: longRunningImports.map(imp => ({
          id: imp.id,
          fileName: imp.file_name,
          status: imp.status,
          duration: Math.round(imp.duration_ms),
          uploadDate: imp.upload_date
        }))
      });
      
      // Send alert for critical cases
      const criticalImports = longRunningImports.filter(imp => imp.duration_ms > config.maxImportTimeMs);
      if (criticalImports.length > 0) {
        await sendAlert('CRITICAL', 'Critical long-running position imports detected', {
          count: criticalImports.length,
          imports: criticalImports
        });
      }
      
      consecutiveWarnings++;
    } else {
      consecutiveWarnings = 0;
    }
    
    client.release();
  } catch (error) {
    log('ERROR', 'Failed to check long-running imports', { error: error.message });
    consecutiveErrors++;
  }
}

// Check database connection pool status
async function checkConnectionPool() {
  try {
    const client = await pool.connect();
    
    // Get pool status
    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      activeCount: pool.totalCount - pool.idleCount
    };
    
    const utilizationRate = poolStatus.activeCount / poolStatus.totalCount;
    
    if (utilizationRate > config.connectionWarningThreshold) {
      log('WARNING', 'High database connection pool utilization', {
        utilizationRate: Math.round(utilizationRate * 100) + '%',
        ...poolStatus
      });
      
      if (utilizationRate > 0.95) {
        await sendAlert('CRITICAL', 'Database connection pool near exhaustion', poolStatus);
      }
    }
    
    // Check for active queries related to position imports
    const activeQueriesQuery = `
      SELECT 
        pid,
        query_start,
        state,
        query
      FROM pg_stat_activity 
      WHERE state = 'active' 
        AND query ILIKE '%position%'
        AND query_start < NOW() - INTERVAL '30 seconds'
      ORDER BY query_start ASC
    `;
    
    const activeQueriesResult = await client.query(activeQueriesQuery);
    
    if (activeQueriesResult.rows.length > 0) {
      log('INFO', 'Active position-related queries detected', {
        count: activeQueriesResult.rows.length,
        queries: activeQueriesResult.rows.map(q => ({
          pid: q.pid,
          state: q.state,
          queryStart: q.query_start,
          query: q.query.substring(0, 100) + '...'
        }))
      });
    }
    
    client.release();
    
    return poolStatus;
  } catch (error) {
    log('ERROR', 'Failed to check connection pool', { error: error.message });
    consecutiveErrors++;
    return null;
  }
}

// Check import performance metrics
async function checkImportPerformance() {
  try {
    const client = await pool.connect();
    
    // Get recent import statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_imports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_imports,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_imports,
        COUNT(CASE WHEN status IN ('uploading', 'processing') THEN 1 END) as active_imports,
        AVG(EXTRACT(EPOCH FROM (completed_date - upload_date)) * 1000) as avg_processing_time_ms,
        MAX(EXTRACT(EPOCH FROM (completed_date - upload_date)) * 1000) as max_processing_time_ms
      FROM upload_queue 
      WHERE source = 'position_import'
        AND upload_date > NOW() - INTERVAL '1 hour'
    `;
    
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    // Check for performance issues
    if (stats.avg_processing_time_ms > config.longRunningThresholdMs) {
      log('WARNING', 'Slow position import performance detected', {
        avgProcessingTime: Math.round(stats.avg_processing_time_ms),
        maxProcessingTime: Math.round(stats.max_processing_time_ms),
        totalImports: stats.total_imports,
        successRate: Math.round((stats.successful_imports / stats.total_imports) * 100) + '%'
      });
    }
    
    // Check failure rate
    const failureRate = stats.failed_imports / stats.total_imports;
    if (failureRate > 0.1 && stats.total_imports > 5) { // More than 10% failure rate
      log('WARNING', 'High position import failure rate', {
        failureRate: Math.round(failureRate * 100) + '%',
        failedImports: stats.failed_imports,
        totalImports: stats.total_imports
      });
    }
    
    client.release();
    
    return stats;
  } catch (error) {
    log('ERROR', 'Failed to check import performance', { error: error.message });
    consecutiveErrors++;
    return null;
  }
}

// Check system resources
function checkSystemResources() {
  try {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    if (memUsageMB.heapUsed > config.memoryThresholdMB) {
      log('WARNING', 'High memory usage detected', memUsageMB);
      
      if (memUsageMB.heapUsed > config.memoryThresholdMB * 2) {
        sendAlert('CRITICAL', 'Critical memory usage detected', memUsageMB);
      }
    }
    
    return memUsageMB;
  } catch (error) {
    log('ERROR', 'Failed to check system resources', { error: error.message });
    return null;
  }
}

// Main monitoring loop
async function runMonitoring() {
  log('INFO', 'Position import monitor started', config);
  
  while (isRunning) {
    try {
      const startTime = Date.now();
      
      // Run all checks
      const [poolStatus, performanceStats, systemResources] = await Promise.all([
        checkConnectionPool(),
        checkImportPerformance(),
        checkSystemResources()
      ]);
      
      // Check for long-running imports
      await checkLongRunningImports();
      
      // Log summary every 5 minutes
      if (Date.now() - lastCheckTime > 300000) {
        log('INFO', 'Position import monitor summary', {
          poolStatus,
          performanceStats,
          systemResources,
          consecutiveWarnings,
          consecutiveErrors
        });
        lastCheckTime = Date.now();
      }
      
      // Reset error counter if no errors
      if (consecutiveErrors === 0) {
        consecutiveErrors = 0;
      }
      
      // Check if we should stop due to too many consecutive errors
      if (consecutiveErrors > 10) {
        log('ERROR', 'Too many consecutive errors, stopping monitor', { consecutiveErrors });
        await sendAlert('CRITICAL', 'Position import monitor stopping due to errors', { consecutiveErrors });
        break;
      }
      
      const checkDuration = Date.now() - startTime;
      
      // Log if check took too long
      if (checkDuration > 5000) {
        log('WARNING', 'Monitor check took too long', { duration: checkDuration });
      }
      
    } catch (error) {
      log('ERROR', 'Monitor check failed', { error: error.message });
      consecutiveErrors++;
    }
    
    // Wait for next check
    await new Promise(resolve => setTimeout(resolve, config.checkIntervalMs));
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  log('INFO', 'Shutting down position import monitor...');
  isRunning = false;
  
  try {
    await pool.end();
    log('INFO', 'Position import monitor stopped');
    process.exit(0);
  } catch (error) {
    log('ERROR', 'Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  log('INFO', 'Received SIGTERM, shutting down...');
  isRunning = false;
  
  try {
    await pool.end();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught exception', { error: error.message, stack: error.stack });
  sendAlert('CRITICAL', 'Position import monitor uncaught exception', { error: error.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled promise rejection', { reason: reason.toString() });
  sendAlert('CRITICAL', 'Position import monitor unhandled promise rejection', { reason: reason.toString() });
});

// Start monitoring
if (require.main === module) {
  runMonitoring().catch(error => {
    log('ERROR', 'Failed to start monitoring', { error: error.message });
    process.exit(1);
  });
}

module.exports = {
  runMonitoring,
  checkConnectionPool,
  checkImportPerformance,
  checkSystemResources,
  checkLongRunningImports
};
