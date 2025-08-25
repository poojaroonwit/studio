#!/usr/bin/env node

/**
 * Health Check Script for Docker/Containerized Environments
 * 
 * This script monitors the queue processor and restarts it if it's not running
 * or if jobs are getting stuck. Optimized for containerized environments.
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

// Skip log file creation entirely - no logging to files

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
    
    // Check if processor is running (Docker-optimized check)
    const isProcessorRunning = await checkProcessorRunningDocker();
    
    if (stuckCount > 0) {
      log(`WARNING: Found ${stuckCount} stuck jobs`, 'WARN');
      
      // Reset stuck jobs
      const resetQuery = `
        UPDATE upload_queue 
        SET status = 'queued', process_date = NULL, updated_at = now(), 
            error = 'Reset by Docker health check - stuck too long'
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
        await startProcessorDocker();
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

async function checkProcessorRunningDocker() {
  return new Promise((resolve) => {
    // In Docker, we can use ps to check for our process
    const ps = spawn('ps', ['aux']);
    let output = '';
    
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ps.on('close', (code) => {
      // Check if our processor script is running
      const isRunning = output.includes('process-upload-queue.cjs') || 
                       output.includes('node') && output.includes('processor');
      resolve(isRunning);
    });
    
    ps.on('error', () => {
      // Fallback: assume it's running if we can't check
      resolve(true);
    });
  });
}

async function startProcessorDocker() {
  log('Starting queue processor in Docker environment...', 'INFO');
  
  const processor = spawn('node', [config.processorScript], {
    detached: false, // Don't detach in Docker
    stdio: 'pipe'
  });
  
  // Handle processor output
  processor.stdout.on('data', (data) => {
    log(`Processor: ${data.toString().trim()}`, 'DEBUG');
  });
  
  processor.stderr.on('data', (data) => {
    log(`Processor Error: ${data.toString().trim()}`, 'ERROR');
  });
  
  processor.on('close', (code) => {
    log(`Processor exited with code ${code}`, 'WARN');
  });
  
  // Wait a moment and check if it started
  setTimeout(async () => {
    const isRunning = await checkProcessorRunningDocker();
    if (isRunning) {
      log('Queue processor started successfully in Docker', 'INFO');
    } else {
      log('Failed to start queue processor in Docker', 'ERROR');
    }
  }, 3000);
}

// Main health check loop
async function main() {
  log('Starting Docker health check service...', 'INFO');
  
  // Run initial check
  await checkQueueHealth();
  
  // Set up periodic checks
  setInterval(async () => {
    await checkQueueHealth();
  }, config.checkIntervalMs);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('Docker health check service stopped', 'INFO');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('Docker health check service stopped', 'INFO');
    process.exit(0);
  });
}

// Start the health check service
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});
