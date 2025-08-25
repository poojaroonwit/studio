#!/usr/bin/env node

/**
 * Health Check Script for Upload Queue Processor
 * 
 * This script monitors the queue processor and restarts it if it's not running
 * or if jobs are getting stuck.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/studio',
  checkIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 60000, // Check every minute
  stuckJobThresholdHours: parseInt(process.env.STUCK_JOB_THRESHOLD_HOURS) || 1,
  processorScript: process.env.PROCESSOR_SCRIPT || 'scripts/process-upload-queue.cjs',
  quietMode: process.env.HEALTH_CHECK_QUIET_MODE === 'true' || false,
  maxConsecutiveErrors: parseInt(process.env.MAX_CONSECUTIVE_ERRORS) || 3
};

// State
let consecutiveErrors = 0;
let lastErrorLogTime = 0;

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function log(message, level = 'INFO') {
  // Skip repetitive error messages in quiet mode
  if (config.quietMode && level === 'ERROR' && 
      (message.includes('Queue processor is not running') || 
       message.includes('Failed to start queue processor'))) {
    const now = Date.now();
    // Only log these errors every 5 minutes to reduce noise
    if (now - lastErrorLogTime < 300000) { // 5 minutes
      return;
    }
    lastErrorLogTime = now;
  }
  
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
  
  // Also write to log file
  fs.appendFileSync(config.logFile, logMessage + '\n');
}

async function checkQueueHealth() {
  const pool = new Pool({ connectionString: config.connectionString });
  
  try {
    // Check for stuck jobs
    const stuckQuery = `
      SELECT COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'inprocess' 
      AND process_date < NOW() - INTERVAL '${config.stuckJobThresholdHours} hours'
    `;
    
    const stuckResult = await pool.query(stuckQuery);
    const stuckCount = parseInt(stuckResult.rows[0].count, 10);
    
    // Check total queue status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM upload_queue 
      GROUP BY status
    `;
    
    const statusResult = await pool.query(statusQuery);
    const statusMap = {};
    statusResult.rows.forEach(row => {
      statusMap[row.status] = parseInt(row.count, 10);
    });
    
    log(`Queue Status: ${JSON.stringify(statusMap)}`);
    
    // Check if processor is running
    const isProcessorRunning = await checkProcessorRunning();
    
    if (stuckCount > 0) {
      log(`WARNING: Found ${stuckCount} stuck jobs`, 'WARN');
      
      // Reset stuck jobs
      const resetQuery = `
        UPDATE upload_queue 
        SET status = 'queued', process_date = NULL, updated_at = now(), 
            error = 'Reset by health check - stuck too long'
        WHERE status = 'inprocess' 
        AND process_date < NOW() - INTERVAL '${config.stuckJobThresholdHours} hours'
      `;
      
      const resetResult = await pool.query(resetQuery);
      log(`Reset ${resetResult.rowCount} stuck jobs`, 'INFO');
    }
    
    if (!isProcessorRunning) {
      consecutiveErrors++;
      log('ERROR: Queue processor is not running!', 'ERROR');
      
      // Only attempt to start if we haven't had too many consecutive failures
      if (consecutiveErrors <= config.maxConsecutiveErrors) {
        await startProcessor();
      } else {
        log(`WARNING: Skipping processor start attempt due to ${consecutiveErrors} consecutive failures`, 'WARN');
      }
    } else {
      if (consecutiveErrors > 0) {
        log(`Queue processor is running normally (recovered from ${consecutiveErrors} consecutive failures)`, 'INFO');
        consecutiveErrors = 0; // Reset error counter
      } else {
        log('Queue processor is running normally', 'INFO');
      }
    }
    
  } catch (error) {
    log(`Error checking queue health: ${error.message}`, 'ERROR');
  } finally {
    await pool.end();
  }
}

async function checkProcessorRunning() {
  return new Promise((resolve) => {
    const ps = spawn('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV']);
    let output = '';
    
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ps.on('close', (code) => {
      // Check if our processor script is running
      const isRunning = output.includes('process-upload-queue.cjs') || 
                       output.includes('node.exe');
      resolve(isRunning);
    });
    
    ps.on('error', () => {
      resolve(false);
    });
  });
}

async function startProcessor() {
  log('Starting queue processor...', 'INFO');
  
  const processor = spawn('node', [config.processorScript], {
    detached: true,
    stdio: 'ignore'
  });
  
  processor.unref();
  
  // Wait a moment and check if it started
  setTimeout(async () => {
    const isRunning = await checkProcessorRunning();
    if (isRunning) {
      log('Queue processor started successfully', 'INFO');
    } else {
      log('Failed to start queue processor', 'ERROR');
    }
  }, 5000);
}

// Main health check loop
async function main() {
  log('Starting health check service...', 'INFO');
  
  // Run initial check
  await checkQueueHealth();
  
  // Set up periodic checks
  setInterval(async () => {
    await checkQueueHealth();
  }, config.checkIntervalMs);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('Health check service stopped', 'INFO');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('Health check service stopped', 'INFO');
    process.exit(0);
  });
}

// Start the health check service
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});
