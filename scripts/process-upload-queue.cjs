#!/usr/bin/env node

/**
 * Upload Queue Processor
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at regular intervals. It runs continuously and handles graceful shutdown.
 * 
 * SIMPLIFIED: Cleaner logging and reduced verbosity for better container output.
 * SIMPLIFIED: Removed complex health checks and infinite loop prevention for stability.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const http = require('http');

// Configuration with improved defaults
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS) || 5000,
  logIntervalMs: parseInt(process.env.LOG_INTERVAL_MS) || 30000,
  batchLimit: parseInt(process.env.PROCESSOR_BATCH_LIMIT) || 5,
  maxRetries: 3,
  retryDelayMs: 5000,
  quietMode: process.env.PROCESSOR_QUIET_MODE === 'true' || false,
  maxConsecutiveErrors: 5,
  backoffMultiplier: 2,
  maxBackoffMs: 300000,
  connectionTimeoutMs: parseInt(process.env.PROCESSOR_CONNECTION_TIMEOUT_MS) || 30000,
  requestTimeoutMs: parseInt(process.env.PROCESSOR_REQUEST_TIMEOUT_MS) || 120000, // Configurable timeout

};

// Override baseUrl for local development if it's set to Docker service name
if (config.baseUrl.includes('8021_fitscan_app:8021') || config.baseUrl.includes('172.21.0.2:8021')) {
  if (process.env.DOCKER_ENV || process.env.NODE_ENV === 'production') {
    console.log(`[INFO] Running in Docker/production environment, using: ${config.baseUrl}`);
  } else {
    config.baseUrl = 'http://localhost:8021';
    console.log(`[INFO] Overriding PROCESSOR_URL to localhost for local development: ${config.baseUrl}`);
  }
}

// State
let isRunning = true;
let lastLogTime = Date.now();
let processedCount = 0;
let errorCount = 0;
let consecutiveErrors = 0;
let currentBackoffMs = config.retryDelayMs;
const startTime = Date.now();

// Simple state tracking
let lastSuccessfulProcessing = Date.now();

// Simplified logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  
  // Skip verbose INFO logs in quiet mode
  if (config.quietMode && level === 'INFO' && 
      (message === 'Batch processed' || message.includes('No queued jobs'))) {
    return;
  }
  
  // Skip empty batch logs entirely to reduce noise
  if (level === 'INFO' && message === 'Batch processed' && 
      data.messages && data.messages.some(m => (m || '').includes('No queued jobs'))) {
    return;
  }
  
  // Simple console output without JSON formatting for better readability
  console.log(`[${level}] ${message}`);
  
  // Periodic status logging
  if (level === 'INFO' && Date.now() - lastLogTime > config.logIntervalMs) {
    console.log(`[STATUS] Processor running - Processed: ${processedCount}, Errors: ${errorCount}, Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`);
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
      },
      timeout: config.requestTimeoutMs,
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 5,
      maxFreeSockets: 5
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
            data: jsonData
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`[DEBUG] HTTP request error: ${error.message} for ${url}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log(`[DEBUG] HTTP request timeout after ${config.requestTimeoutMs}ms for ${url}`);
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(config.connectionTimeoutMs, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Process a batch of jobs
async function processBatch() {
  try {
    const response = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=${config.batchLimit}`, {
      method: 'POST'
    });

    if (response.status === 200) {
      const processedCount = response.data.processed_count || 0;
      const msgs = response.data.messages || [];
      
      // Only log if jobs were actually processed
      if (processedCount > 0) {
        log('INFO', `Processed ${processedCount} jobs`);
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs;
        lastSuccessfulProcessing = Date.now();
      } else if (msgs.some(m => (m || '').includes('No queued jobs'))) {
        // Don't log empty batches to reduce noise
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs;
      }
      
      return processedCount;
    } else if (response.status === 404) {
      // Fall back to single-job processing
      log('WARN', 'Batch endpoint not found, falling back to single processing');
      await processJob();
      return 1;
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', `Failed to process batch: ${error.message}`);
    
    // Implement exponential backoff
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
      log('WARN', `Too many consecutive errors, backing off for ${currentBackoffMs}ms`);
    }
    
    return 0;
  }
}

// Process a single job (fallback)
async function processJob() {
  try {
    const response = await makeRequest(`${config.baseUrl}/api/upload-queue/process`, {
      method: 'POST'
    });
    
    if (response.status === 200) {
      if (response.data.job) {
        const job = response.data.job;
        log('INFO', `Processed job ${job.id} (${job.file_name}) - Status: ${job.status}`);
        
        if (job.status === 'success') {
          processedCount++;
          consecutiveErrors = 0;
          currentBackoffMs = config.retryDelayMs;
          lastSuccessfulProcessing = Date.now();
        } else {
          errorCount++;
          consecutiveErrors++;
        }
      } else if (response.data.message === 'No queued jobs') {
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs;
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', `Failed to process job: ${error.message}`);
    
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
    }
  }
}



// Main processing loop
async function processLoop() {
  while (isRunning) {
    try {
      const count = await processBatch();
      
      // Use dynamic backoff based on error state
      const waitTime = consecutiveErrors >= config.maxConsecutiveErrors ? currentBackoffMs : config.intervalMs;
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      log('ERROR', `Unexpected error in process loop: ${error.message}`);
      
      consecutiveErrors++;
      
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
      }
      
      await new Promise(resolve => setTimeout(resolve, currentBackoffMs));
    }
  }
}

// Graceful shutdown
function shutdown(signal) {
  log('INFO', `Received ${signal}, shutting down gracefully`);
  isRunning = false;
  
  setTimeout(() => {
    log('INFO', `Processor shutdown complete - Total processed: ${processedCount}, Total errors: ${errorCount}`);
    process.exit(0);
  }, 2000);
}

// Signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Unhandled error handlers
process.on('uncaughtException', (error) => {
  log('ERROR', `Uncaught exception: ${error.message}`);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `Unhandled rejection: ${reason?.message || reason}`);
  shutdown('unhandledRejection');
});

// Start the processor
log('INFO', 'Upload queue processor starting', {
  config: {
    baseUrl: config.baseUrl,
    intervalMs: config.intervalMs,
    batchLimit: config.batchLimit,
    maxRetries: config.maxRetries,
    retryDelayMs: config.retryDelayMs,
    maxConsecutiveErrors: config.maxConsecutiveErrors,
    maxBackoffMs: config.maxBackoffMs,
    connectionTimeoutMs: config.connectionTimeoutMs,
    requestTimeoutMs: config.requestTimeoutMs
  }
});

processLoop().catch((error) => {
  log('ERROR', `Fatal error in process loop: ${error.message}`);
  process.exit(1);
});
