#!/usr/bin/env node

/**
 * Process Queue Monitor
 * 
 * This script monitors the upload queue for potential infinite loops and system issues.
 * It provides early detection and prevention mechanisms.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Configuration
const config = {
  dbHost: process.env.POSTGRES_HOST || 'localhost',
  dbPort: process.env.POSTGRES_PORT || 5432,
  dbUser: process.env.POSTGRES_USER || 'postgres',
  dbPassword: process.env.POSTGRES_PASSWORD || 'password',
  dbName: process.env.POSTGRES_DB || 'studio',
  checkIntervalMs: parseInt(process.env.MONITOR_CHECK_INTERVAL_MS) || 30000, // 30 seconds
  maxStuckJobs: parseInt(process.env.MAX_STUCK_JOBS) || 10,
  maxProcessingTimeMinutes: parseInt(process.env.MAX_PROCESSING_TIME_MINUTES) || 30,
  maxRetryCount: parseInt(process.env.MAX_RETRY_COUNT) || 5,
  alertThreshold: parseInt(process.env.ALERT_THRESHOLD) || 5
};

// Database connection
const pool = new Pool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Monitoring state
let alertCount = 0;
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, data);
}

// Check for stuck jobs
async function checkStuckJobs() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as stuck_count,
        COUNT(CASE WHEN process_date < NOW() - INTERVAL '${config.maxProcessingTimeMinutes} minutes' THEN 1 END) as long_processing_count,
        COUNT(CASE WHEN webhook_payload->>'retry_count' IS NOT NULL AND (webhook_payload->>'retry_count')::int >= ${config.maxRetryCount} THEN 1 END) as high_retry_count
      FROM upload_queue 
      WHERE status = 'inprocess'
    `);
    
    const stuckCount = parseInt(result.rows[0].stuck_count, 10);
    const longProcessingCount = parseInt(result.rows[0].long_processing_count, 10);
    const highRetryCount = parseInt(result.rows[0].high_retry_count, 10);
    
    if (stuckCount > config.maxStuckJobs) {
      log('WARN', `Too many stuck jobs: ${stuckCount}`, { 
        stuckCount, 
        maxStuckJobs: config.maxStuckJobs,
        longProcessingCount,
        highRetryCount
      });
      return { issue: 'stuck_jobs', count: stuckCount };
    }
    
    if (longProcessingCount > 0) {
      log('WARN', `Jobs processing too long: ${longProcessingCount}`, { 
        longProcessingCount,
        maxProcessingTimeMinutes: config.maxProcessingTimeMinutes
      });
      return { issue: 'long_processing', count: longProcessingCount };
    }
    
    if (highRetryCount > 0) {
      log('WARN', `Jobs with high retry count: ${highRetryCount}`, { 
        highRetryCount,
        maxRetryCount: config.maxRetryCount
      });
      return { issue: 'high_retries', count: highRetryCount };
    }
    
    return null;
  } finally {
    client.release();
  }
}

// Check for infinite loop patterns
async function checkInfiniteLoopPatterns() {
  const client = await pool.connect();
  try {
    // Check for jobs that keep getting processed repeatedly
    const result = await client.query(`
      SELECT 
        file_path,
        COUNT(*) as job_count,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN status IN ('error', 'fail') THEN 1 END) as failure_count,
        COUNT(CASE WHEN status = 'inprocess' THEN 1 END) as processing_count
      FROM upload_queue 
      WHERE file_path IS NOT NULL 
      AND file_path != ''
      GROUP BY file_path 
      HAVING COUNT(*) > 3
      ORDER BY job_count DESC
      LIMIT 10
    `);
    
    const suspiciousFiles = result.rows.filter(row => {
      const jobCount = parseInt(row.job_count, 10);
      const successCount = parseInt(row.success_count, 10);
      const failureCount = parseInt(row.failure_count, 10);
      const processingCount = parseInt(row.processing_count, 10);
      
      // Suspicious if many jobs for same file but no success
      return jobCount > 3 && successCount === 0 && (failureCount > 2 || processingCount > 1);
    });
    
    if (suspiciousFiles.length > 0) {
      log('WARN', `Suspicious file processing patterns detected`, { 
        suspiciousFiles: suspiciousFiles.map(f => ({
          file_path: f.file_path,
          job_count: f.job_count,
          success_count: f.success_count,
          failure_count: f.failure_count,
          processing_count: f.processing_count
        }))
      });
      return { issue: 'suspicious_patterns', files: suspiciousFiles };
    }
    
    return null;
  } finally {
    client.release();
  }
}

// Check system health
async function checkSystemHealth() {
  const client = await pool.connect();
  try {
    // Check database connection and basic operations
    const startTime = Date.now();
    await client.query('SELECT 1');
    const queryTime = Date.now() - startTime;
    
    if (queryTime > 1000) {
      log('WARN', `Database query slow: ${queryTime}ms`, { queryTime });
      return { issue: 'slow_database', queryTime };
    }
    
    // Check queue statistics
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued_jobs,
        COUNT(CASE WHEN status = 'inprocess' THEN 1 END) as processing_jobs,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_jobs,
        COUNT(CASE WHEN status IN ('error', 'fail') THEN 1 END) as failed_jobs
      FROM upload_queue
    `);
    
    const stats = statsResult.rows[0];
    const totalJobs = parseInt(stats.total_jobs, 10);
    const queuedJobs = parseInt(stats.queued_jobs, 10);
    const processingJobs = parseInt(stats.processing_jobs, 10);
    const successJobs = parseInt(stats.success_jobs, 10);
    const failedJobs = parseInt(stats.failed_jobs, 10);
    
    // Check for unusual patterns
    if (processingJobs > 20) {
      log('WARN', `Too many processing jobs: ${processingJobs}`, { processingJobs });
      return { issue: 'too_many_processing', count: processingJobs };
    }
    
    if (failedJobs > totalJobs * 0.5 && totalJobs > 10) {
      log('WARN', `High failure rate: ${failedJobs}/${totalJobs}`, { 
        failedJobs, 
        totalJobs, 
        failureRate: (failedJobs / totalJobs * 100).toFixed(1) + '%'
      });
      return { issue: 'high_failure_rate', rate: failedJobs / totalJobs };
    }
    
    return null;
  } finally {
    client.release();
  }
}

// Take corrective action
async function takeCorrectiveAction(issue) {
  const client = await pool.connect();
  try {
    switch (issue.issue) {
      case 'stuck_jobs':
        log('INFO', 'Resetting stuck jobs...');
        await client.query(`
          UPDATE upload_queue 
          SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset by monitor due to stuck status'
          WHERE status = 'inprocess' 
          AND process_date < NOW() - INTERVAL '${config.maxProcessingTimeMinutes} minutes'
        `);
        break;
        
      case 'long_processing':
        log('INFO', 'Resetting long-processing jobs...');
        await client.query(`
          UPDATE upload_queue 
          SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset by monitor due to long processing time'
          WHERE status = 'inprocess' 
          AND process_date < NOW() - INTERVAL '${config.maxProcessingTimeMinutes} minutes'
        `);
        break;
        
      case 'high_retries':
        log('INFO', 'Marking high-retry jobs as failed...');
        await client.query(`
          UPDATE upload_queue 
          SET status = 'error', completed_date = now(), updated_at = now(), error = 'Max retries exceeded'
          WHERE status = 'inprocess' 
          AND webhook_payload->>'retry_count' IS NOT NULL 
          AND (webhook_payload->>'retry_count')::int >= ${config.maxRetryCount}
        `);
        break;
        
      case 'suspicious_patterns':
        log('INFO', 'Investigating suspicious file patterns...');
        // Log details for manual investigation
        for (const file of issue.files) {
          log('INFO', `Suspicious file: ${file.file_path}`, {
            jobCount: file.job_count,
            successCount: file.success_count,
            failureCount: file.failure_count
          });
        }
        break;
        
      case 'too_many_processing':
        log('INFO', 'Too many processing jobs detected, monitoring...');
        // Just log for now, let the process queue handle it
        break;
        
      case 'high_failure_rate':
        log('INFO', 'High failure rate detected, monitoring...');
        // Just log for now, investigate manually
        break;
        
      default:
        log('WARN', `Unknown issue type: ${issue.issue}`);
    }
  } finally {
    client.release();
  }
}

// Send alert
function sendAlert(issue) {
  const now = Date.now();
  
  // Prevent alert spam
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    return;
  }
  
  alertCount++;
  lastAlertTime = now;
  
  log('ERROR', `ALERT #${alertCount}: Process queue issue detected`, {
    issue: issue.issue,
    details: issue,
    alertCount,
    timestamp: new Date().toISOString()
  });
  
  // Here you could add additional alert mechanisms:
  // - Send email
  // - Send Slack notification
  // - Create incident ticket
  // - Restart services
}

// Main monitoring loop
async function monitorLoop() {
  log('INFO', 'Starting process queue monitor', { config });
  
  while (true) {
    try {
      // Check for various issues
      const stuckJobsIssue = await checkStuckJobs();
      const infiniteLoopIssue = await checkInfiniteLoopPatterns();
      const systemHealthIssue = await checkSystemHealth();
      
      // Take action if issues found
      if (stuckJobsIssue) {
        await takeCorrectiveAction(stuckJobsIssue);
        sendAlert(stuckJobsIssue);
      }
      
      if (infiniteLoopIssue) {
        await takeCorrectiveAction(infiniteLoopIssue);
        sendAlert(infiniteLoopIssue);
      }
      
      if (systemHealthIssue) {
        await takeCorrectiveAction(systemHealthIssue);
        sendAlert(systemHealthIssue);
      }
      
      // Log periodic status
      if (!stuckJobsIssue && !infiniteLoopIssue && !systemHealthIssue) {
        log('INFO', 'Process queue health check passed');
      }
      
    } catch (error) {
      log('ERROR', 'Monitor error', { error: error.message, stack: error.stack });
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, config.checkIntervalMs));
  }
}

// Graceful shutdown
function shutdown(signal) {
  log('INFO', `Received ${signal}, shutting down monitor`);
  pool.end();
  process.exit(0);
}

// Signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Error handlers
process.on('uncaughtException', (error) => {
  log('ERROR', `Uncaught exception: ${error.message}`, { stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `Unhandled rejection: ${reason?.message || reason}`);
  shutdown('unhandledRejection');
});

// Start monitoring
monitorLoop().catch((error) => {
  log('ERROR', `Fatal error in monitor loop: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
