#!/usr/bin/env node

/**
 * Upload Queue Processor
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at regular intervals. It runs continuously and handles graceful shutdown.
 * 
 * IMPROVED: Added connection pooling, longer intervals, and better error handling
 * to prevent database connection pool exhaustion.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const http = require('http');

// Configuration with improved defaults to prevent connection pool exhaustion
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS) || 30000, // Increased from 5000 to 30000 (30 seconds)
  logIntervalMs: parseInt(process.env.LOG_INTERVAL_MS) || 60000, // Increased from 30000 to 60000 (1 minute)
  batchLimit: parseInt(process.env.PROCESSOR_BATCH_LIMIT) || 5, // Reduced from 10 to 5 for better performance
  maxRetries: 3,
  retryDelayMs: 5000, // Increased from 1000 to 5000 (5 seconds)
  quietMode: process.env.PROCESSOR_QUIET_MODE === 'true' || false,
  emptyBatchLogIntervalMs: parseInt(process.env.EMPTY_BATCH_LOG_INTERVAL_MS) || 120000, // Increased to 2 minutes
  maxConsecutiveErrors: 5, // New: limit consecutive errors before backing off
  backoffMultiplier: 2, // New: exponential backoff multiplier
  maxBackoffMs: 300000, // New: maximum backoff of 5 minutes
  connectionTimeoutMs: 10000, // New: 10 second connection timeout
  requestTimeoutMs: 30000, // New: 30 second request timeout
  healthCheckIntervalMs: 60000, // New: check app health every minute
  maxHealthCheckFailures: 3 // New: max consecutive health check failures
};

// Override baseUrl for local development if it's set to Docker service name
if (config.baseUrl.includes('app:8021') || config.baseUrl.includes('172.21.0.2:8021')) {
  config.baseUrl = 'http://localhost:8021';
  console.log(`[INFO] Overriding PROCESSOR_URL to localhost for local development: ${config.baseUrl}`);
}

// State
let isRunning = true;
let lastLogTime = Date.now();
let lastEmptyBatchLogTime = 0;
let processedCount = 0;
let errorCount = 0;
let consecutiveErrors = 0;
let emptyBatchCount = 0;
let currentBackoffMs = config.retryDelayMs; // New: dynamic backoff
const startTime = Date.now();

// Health check state
let lastHealthCheck = 0;
let healthCheckFailures = 0;
let isAppHealthy = false;

// Logging utility
function log(level, message, data = {}) {
  // Skip INFO logs in quiet mode unless they're important
  if (config.quietMode && level === 'INFO' && 
      (message === 'Batch processed' || message.includes('No queued jobs'))) {
    return;
  }
  
  // Additional check: if it's an empty batch with "No queued jobs", skip logging entirely
  if (level === 'INFO' && message === 'Batch processed' && 
      data.messages && data.messages.some(m => (m || '').includes('No queued jobs'))) {
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
      currentBackoffMs,
      uptime: Math.floor((Date.now() - startTime) / 1000)
    }));
    lastLogTime = Date.now();
  }
}

// HTTP request utility with improved timeout and connection management
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
      timeout: config.requestTimeoutMs, // Add request timeout
      keepAlive: true, // Enable keep-alive to reuse connections
      keepAliveMsecs: 1000, // Keep connections alive for 1 second
      maxSockets: 5, // Limit concurrent connections
      maxFreeSockets: 5 // Limit free connections in pool
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
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    // Set connection timeout
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
          currentBackoffMs = config.retryDelayMs; // Reset backoff on success
        } else {
          errorCount++;
          consecutiveErrors++;
        }
      } else if (response.data.message === 'No queued jobs') {
        // No jobs to process, this is normal
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs; // Reset backoff
      } else if (response.data.message && response.data.message.includes('Max concurrent')) {
        // Max concurrent jobs running, wait and try again
        log('INFO', 'Max concurrent jobs running, waiting', {
          message: response.data.message
        });
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs; // Reset backoff
      } else {
        log('INFO', 'No jobs processed', {
          response: response.data
        });
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs; // Reset backoff
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
    
    // Implement exponential backoff
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
      log('WARN', 'Too many consecutive errors, backing off', {
        consecutiveErrors,
        backoffMs: currentBackoffMs
      });
    }
  }
}

// Health check function to verify the main application is running
async function checkAppHealth() {
  const now = Date.now();
  
  // Only check health periodically to avoid overwhelming the server
  if (now - lastHealthCheck < config.healthCheckIntervalMs) {
    return isAppHealthy;
  }
  
  lastHealthCheck = now;
  
  try {
    const response = await makeRequest(`${config.baseUrl}/health`, {
      method: 'GET'
    });
    
    if (response.status === 200) {
      healthCheckFailures = 0;
      isAppHealthy = true;
      return true;
    } else {
      throw new Error(`Health check failed with status ${response.status}`);
    }
  } catch (error) {
    healthCheckFailures++;
    isAppHealthy = false;
    
    if (healthCheckFailures >= config.maxHealthCheckFailures) {
      log('ERROR', 'App health check failed repeatedly', {
        error: error.message,
        healthCheckFailures,
        maxFailures: config.maxHealthCheckFailures
      });
    }
    
    return false;
  }
}

// Process a batch of jobs in one call (uses new endpoint if available)
async function processBatch() {
  try {
    // Check app health before attempting to process
    const isHealthy = await checkAppHealth();
    if (!isHealthy) {
      log('WARN', 'Skipping batch processing - app is not healthy', {
        healthCheckFailures,
        maxFailures: config.maxHealthCheckFailures
      });
      return 0;
    }
    
    // Use a reasonable limit to prevent overwhelming the system
    const response = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=${config.batchLimit}`, {
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
        // Skip logging empty batches entirely when quiet mode is enabled
        if (!config.quietMode && now - lastEmptyBatchLogTime > config.emptyBatchLogIntervalMs) {
          log('INFO', 'Batch processed', { processedCount, messages: msgs, emptyBatchCount });
          lastEmptyBatchLogTime = now;
        }
      } else {
        // Log non-empty batches immediately
        log('INFO', 'Batch processed', { processedCount, messages: msgs });
        emptyBatchCount = 0; // Reset empty batch counter when we process something
      }

      // Update counters and reset backoff on success
      if (processedCount > 0) {
        processedCount; // no-op variable reference to keep linter calm in some environments
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs; // Reset backoff
      } else if (msgs.some(m => (m || '').includes('No queued jobs'))) {
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs; // Reset backoff
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
    
    // Implement exponential backoff
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
      log('WARN', 'Too many consecutive errors, backing off', {
        consecutiveErrors,
        backoffMs: currentBackoffMs
      });
    }
    
    return 0;
  }
}

// Main processing loop with improved error handling and backoff
async function processLoop() {
  while (isRunning) {
    try {
      // Prefer batch endpoint for efficiency; falls back automatically
      const count = await processBatch();
      
      // Use dynamic backoff based on error state
      const waitTime = consecutiveErrors >= config.maxConsecutiveErrors ? currentBackoffMs : config.intervalMs;
      
      // Removed DEBUG log to reduce console spam
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      log('ERROR', 'Unexpected error in process loop', {
        error: error.message
      });
      
      consecutiveErrors++;
      
      // Use exponential backoff for unexpected errors
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentBackoffMs));
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
      totalErrors: errorCount,
      finalBackoffMs: currentBackoffMs
    });
    process.exit(0);
  }, 2000); // Increased from 1000 to 2000ms
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
  log('ERROR', 'Fatal error in process loop', { error: error.message, stack: error.stack });
  process.exit(1);
});
