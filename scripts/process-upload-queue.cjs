#!/usr/bin/env node

/**
 * Upload Queue Processor
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at regular intervals. It runs continuously and handles graceful shutdown.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS) || 5000,
  logIntervalMs: parseInt(process.env.LOG_INTERVAL_MS) || 30000,
  batchLimit: parseInt(process.env.PROCESSOR_BATCH_LIMIT) || 10, // Reduced from 25 to 10 for better performance
  maxRetries: 3,
  retryDelayMs: 1000,
  quietMode: process.env.PROCESSOR_QUIET_MODE === 'true' || false,
  emptyBatchLogIntervalMs: parseInt(process.env.EMPTY_BATCH_LOG_INTERVAL_MS) || 60000 // Log empty batches only every minute
};

// State
let isRunning = true;
let lastLogTime = Date.now();
let lastEmptyBatchLogTime = 0;
let processedCount = 0;
let errorCount = 0;
let consecutiveErrors = 0;
let emptyBatchCount = 0;

// Logging utility
function log(level, message, data = {}) {
  // Skip INFO logs in quiet mode unless they're important
  if (config.quietMode && level === 'INFO' && 
      (message === 'Batch processed' || message.includes('No queued jobs'))) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...data
  };
  
  console.log(JSON.stringify(logData));
  
  // Periodic status logging
  if (level === 'INFO' && Date.now() - lastLogTime > config.logIntervalMs) {
    console.log(JSON.stringify({
      timestamp,
      level: 'STATUS',
      message: 'Processor status',
      processedCount,
      errorCount,
      consecutiveErrors,
      emptyBatchCount,
      uptime: Math.floor((Date.now() - startTime) / 1000)
    }));
    lastLogTime = Date.now();
  }
}

// HTTP request utility
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Process a single job
async function processJob() {
  try {
    const response = await makeRequest(`${config.baseUrl}/api/upload-queue/process`, {
      method: 'POST'
    });
    
    if (response.status === 200) {
      if (response.data.job) {
        const job = response.data.job;
        log('INFO', 'Processed job', {
          jobId: job.id,
          fileName: job.file_name,
          status: job.status,
          error: job.error
        });
        
        if (job.status === 'success') {
          processedCount++;
          consecutiveErrors = 0;
        } else {
          errorCount++;
          consecutiveErrors++;
        }
      } else if (response.data.message === 'No queued jobs') {
        // No jobs to process, this is normal
        consecutiveErrors = 0;
      } else if (response.data.message && response.data.message.includes('Max concurrent')) {
        // Max concurrent jobs running, wait and try again
        log('INFO', 'Max concurrent jobs running, waiting', {
          message: response.data.message
        });
        consecutiveErrors = 0;
      } else {
        log('INFO', 'No jobs processed', {
          response: response.data
        });
        consecutiveErrors = 0;
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    
    log('ERROR', 'Failed to process job', {
      error: error.message,
      consecutiveErrors
    });
    
    // If we have too many consecutive errors, wait longer
    if (consecutiveErrors >= config.maxRetries) {
      log('WARN', 'Too many consecutive errors, waiting longer', {
        consecutiveErrors,
        waitTimeMs: config.retryDelayMs * 2
      });
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs * 2));
    }
  }
}

// Process a batch of jobs in one call (uses new endpoint if available)
async function processBatch() {
  try {
    // Use a high limit to ensure we utilize full concurrent capacity
    // The endpoint will automatically limit to maxConcurrentProcessors setting
    const response = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=100`, {
      method: 'POST'
    });

    if (response.status === 200) {
      const processedCount = response.data.processed_count || 0;
      const msgs = response.data.messages || [];
      
      // Only log empty batches periodically to reduce noise
      const now = Date.now();
      const isEmptyBatch = processedCount === 0 && msgs.some(m => (m || '').includes('No queued jobs'));
      
      if (isEmptyBatch) {
        emptyBatchCount++;
        // Only log empty batches every minute to reduce noise
        if (now - lastEmptyBatchLogTime > config.emptyBatchLogIntervalMs) {
          log('INFO', 'Batch processed', { processedCount, messages: msgs, emptyBatchCount });
          lastEmptyBatchLogTime = now;
        }
      } else {
        // Log non-empty batches immediately
        log('INFO', 'Batch processed', { processedCount, messages: msgs });
        emptyBatchCount = 0; // Reset empty batch counter when we process something
      }

      // Update counters heuristically
      if (processedCount > 0) {
        processedCount; // no-op variable reference to keep linter calm in some environments
        consecutiveErrors = 0;
      } else if (msgs.some(m => (m || '').includes('No queued jobs'))) {
        consecutiveErrors = 0;
      }
      return processedCount;
    } else if (response.status === 404) {
      // Endpoint missing on server, fall back to single-job processing
      log('WARN', 'Batch endpoint not found, falling back to single processing');
      await processJob();
      return 1;
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', 'Failed to process batch', { error: error.message, consecutiveErrors });
    if (consecutiveErrors >= config.maxRetries) {
      log('WARN', 'Too many consecutive errors, waiting longer', {
        consecutiveErrors,
        waitTimeMs: config.retryDelayMs * 2
      });
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs * 2));
    }
    return 0;
  }
}

// Main processing loop
async function processLoop() {
  while (isRunning) {
    try {
      // Prefer batch endpoint for efficiency; falls back automatically
      const count = await processBatch();
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, config.intervalMs));
    } catch (error) {
      log('ERROR', 'Unexpected error in process loop', {
        error: error.message
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));
    }
  }
}

// Graceful shutdown
function shutdown(signal) {
  log('INFO', `Received ${signal}, shutting down gracefully`);
  isRunning = false;
  
  // Give some time for current operations to complete
  setTimeout(() => {
    log('INFO', 'Processor shutdown complete', {
      totalProcessed: processedCount,
      totalErrors: errorCount
    });
    process.exit(0);
  }, 1000);
}

// Signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Unhandled error handlers
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled rejection', {
    reason: reason?.message || reason,
    promise: promise
  });
  process.exit(1);
});

// Start the processor
const startTime = Date.now();

log('INFO', 'Starting Upload Queue Processor', {
  baseUrl: config.baseUrl,
  intervalMs: config.intervalMs,
  logIntervalMs: config.logIntervalMs,
  maxRetries: config.maxRetries
});

log('INFO', 'Configuration', {
  baseUrl: config.baseUrl,
  interval: `${config.intervalMs}ms`,
  logInterval: `${config.logIntervalMs}ms`,
  maxRetries: config.maxRetries
});

// Start the main processing loop
processLoop().catch((error) => {
  log('ERROR', 'Fatal error in main process loop', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
