#!/usr/bin/env node

/**
 * Upload Queue Processor
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at regular intervals. It runs continuously and handles graceful shutdown.
 * 
 * SIMPLIFIED: Cleaner logging and reduced verbosity for better container output.
 * ENHANCED: Added infinite loop prevention with circuit breakers and iteration limits.
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
  // NEW: Infinite loop prevention settings
  maxIterationsWithoutProgress: parseInt(process.env.MAX_ITERATIONS_WITHOUT_PROGRESS) || 100,
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 50,
  circuitBreakerTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS) || 300000, // 5 minutes
  maxTotalIterations: parseInt(process.env.MAX_TOTAL_ITERATIONS) || 10000,
  // ENHANCED: Additional infinite loop prevention
  maxConsecutiveEmptyBatches: parseInt(process.env.MAX_CONSECUTIVE_EMPTY_BATCHES) || 50,
  maxTotalProcessingTimeMs: parseInt(process.env.MAX_TOTAL_PROCESSING_TIME_MS) || 24 * 60 * 60 * 1000, // 24 hours
  maxStuckJobsThreshold: parseInt(process.env.MAX_STUCK_JOBS_THRESHOLD) || 20
};

// Override baseUrl for local development if it's set to Docker service name
if (config.baseUrl.includes('app:8021') || config.baseUrl.includes('172.21.0.2:8021')) {
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

// NEW: Infinite loop prevention state
let iterationsWithoutProgress = 0;
let totalIterations = 0;
let circuitBreakerFailures = 0;
let circuitBreakerOpen = false;
let circuitBreakerOpenTime = 0;
let lastSuccessfulProcessing = Date.now();
// ENHANCED: Additional infinite loop prevention state
let consecutiveEmptyBatches = 0;
let totalProcessingStartTime = Date.now();
let stuckJobsCount = 0;

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
    console.log(`[STATUS] Processor running - Processed: ${processedCount}, Errors: ${errorCount}, Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s, Iterations: ${totalIterations}, Circuit Breaker: ${circuitBreakerOpen ? 'OPEN' : 'CLOSED'}`);
    lastLogTime = Date.now();
  }
}

// NEW: Circuit breaker functions
function isCircuitBreakerOpen() {
  if (!circuitBreakerOpen) {
    return false;
  }
  
  // Check if circuit breaker timeout has passed
  if (Date.now() - circuitBreakerOpenTime > config.circuitBreakerTimeoutMs) {
    log('INFO', 'Circuit breaker timeout expired, attempting to close');
    circuitBreakerOpen = false;
    circuitBreakerFailures = 0;
    return false;
  }
  
  return true;
}

function recordCircuitBreakerFailure() {
  circuitBreakerFailures++;
  if (circuitBreakerFailures >= config.circuitBreakerThreshold) {
    circuitBreakerOpen = true;
    circuitBreakerOpenTime = Date.now();
    log('WARN', `Circuit breaker opened after ${circuitBreakerFailures} consecutive failures`);
  }
}

function recordCircuitBreakerSuccess() {
  if (circuitBreakerFailures > 0) {
    circuitBreakerFailures = Math.max(0, circuitBreakerFailures - 1);
  }
}

// NEW: Simple connectivity test
async function testConnectivity() {
  try {
    console.log(`[DEBUG] Testing connectivity to ${config.baseUrl}/api/health`);
    const response = await makeRequest(`${config.baseUrl}/api/health`, {
      method: 'GET'
    });
    console.log(`[DEBUG] Health check response: ${response.status}`);
    return response.status === 200;
  } catch (error) {
    console.log(`[DEBUG] Health check failed: ${error.message}`);
    return false;
  }
}

// NEW: Health check function


// ENHANCED: Check for stuck jobs
async function checkStuckJobs() {
  try {
    const response = await makeRequest(`${config.baseUrl}/api/upload-queue/stats`, {
      method: 'GET'
    });
    
    if (response.status === 200 && response.data) {
      stuckJobsCount = response.data.stuck_jobs || 0;
      
      if (stuckJobsCount > 0) {
        log('WARN', `Detected ${stuckJobsCount} stuck jobs`);
      }
      
      return response.data;
    }
  } catch (error) {
    log('ERROR', `Failed to check stuck jobs: ${error.message}`);
  }
  
  return null;
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
        iterationsWithoutProgress = 0;
        consecutiveEmptyBatches = 0; // Reset empty batch counter
        lastSuccessfulProcessing = Date.now();
        recordCircuitBreakerSuccess();
      } else if (msgs.some(m => (m || '').includes('No queued jobs'))) {
        // Don't log empty batches to reduce noise
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs;
        iterationsWithoutProgress++;
        consecutiveEmptyBatches++; // Track empty batches
        recordCircuitBreakerSuccess();
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
    iterationsWithoutProgress++;
    recordCircuitBreakerFailure();
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
          iterationsWithoutProgress = 0;
          lastSuccessfulProcessing = Date.now();
          recordCircuitBreakerSuccess();
        } else {
          errorCount++;
          consecutiveErrors++;
          iterationsWithoutProgress++;
          recordCircuitBreakerFailure();
        }
      } else if (response.data.message === 'No queued jobs') {
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs;
        iterationsWithoutProgress++;
        recordCircuitBreakerSuccess();
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    iterationsWithoutProgress++;
    recordCircuitBreakerFailure();
    log('ERROR', `Failed to process job: ${error.message}`);
    
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
    }
  }
}

// NEW: Infinite loop detection and prevention
function checkForInfiniteLoop() {
  // Check if we've exceeded maximum iterations without progress
  if (iterationsWithoutProgress >= config.maxIterationsWithoutProgress) {
    log('ERROR', `Infinite loop detected: ${iterationsWithoutProgress} iterations without progress`);
    return true;
  }
  
  // Check if we've exceeded maximum total iterations
  if (totalIterations >= config.maxTotalIterations) {
    log('ERROR', `Maximum total iterations reached: ${totalIterations}`);
    return true;
  }
  
  // Check if circuit breaker is open
  if (isCircuitBreakerOpen()) {
    log('WARN', 'Circuit breaker is open, skipping processing');
    return true;
  }
  
  // Check if we haven't had successful processing for too long
  const timeSinceLastSuccess = Date.now() - lastSuccessfulProcessing;
  if (timeSinceLastSuccess > config.circuitBreakerTimeoutMs * 2) {
    log('ERROR', `No successful processing for ${Math.floor(timeSinceLastSuccess / 1000)}s, possible infinite loop`);
    return true;
  }
  
  // ENHANCED: Check for too many consecutive empty batches
  if (consecutiveEmptyBatches >= config.maxConsecutiveEmptyBatches) {
    log('ERROR', `Too many consecutive empty batches: ${consecutiveEmptyBatches}, possible infinite loop`);
    return true;
  }
  
  // ENHANCED: Check total processing time
  const totalProcessingTime = Date.now() - totalProcessingStartTime;
  if (totalProcessingTime > config.maxTotalProcessingTimeMs) {
    log('ERROR', `Total processing time exceeded limit: ${Math.floor(totalProcessingTime / 1000)}s, stopping to prevent infinite loop`);
    return true;
  }
  
  // ENHANCED: Check for too many stuck jobs
  if (stuckJobsCount >= config.maxStuckJobsThreshold) {
    log('ERROR', `Too many stuck jobs detected: ${stuckJobsCount}, possible infinite loop`);
    return true;
  }
  
  return false;
}

// Main processing loop
async function processLoop() {
  // NEW: Initial connectivity test
  console.log('[DEBUG] Performing initial connectivity test...');
  const connectivityOk = await testConnectivity();
  if (!connectivityOk) {
    log('ERROR', 'Initial connectivity test failed, exiting');
    return;
  }
  console.log('[DEBUG] Initial connectivity test passed');
  
  while (isRunning) {
    try {
      totalIterations++;
      
      // NEW: Check for infinite loop conditions
      if (checkForInfiniteLoop()) {
        log('ERROR', 'Infinite loop detected, exiting process loop');
        break;
      }
      

      
      const count = await processBatch();
      
      // Use dynamic backoff based on error state
      const waitTime = consecutiveErrors >= config.maxConsecutiveErrors ? currentBackoffMs : config.intervalMs;
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      log('ERROR', `Unexpected error in process loop: ${error.message}`);
      
      consecutiveErrors++;
      iterationsWithoutProgress++;
      recordCircuitBreakerFailure();
      
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
    log('INFO', `Processor shutdown complete - Total processed: ${processedCount}, Total errors: ${errorCount}, Total iterations: ${totalIterations}`);
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
    requestTimeoutMs: config.requestTimeoutMs,
    // NEW: Infinite loop prevention settings
    maxIterationsWithoutProgress: config.maxIterationsWithoutProgress,
    circuitBreakerThreshold: config.circuitBreakerThreshold,
    circuitBreakerTimeoutMs: config.circuitBreakerTimeoutMs,
    maxTotalIterations: config.maxTotalIterations,
    // ENHANCED: Additional infinite loop prevention settings
    maxConsecutiveEmptyBatches: config.maxConsecutiveEmptyBatches,
    maxTotalProcessingTimeMs: config.maxTotalProcessingTimeMs,
    maxStuckJobsThreshold: config.maxStuckJobsThreshold
  }
});

processLoop().catch((error) => {
  log('ERROR', `Fatal error in process loop: ${error.message}`);
  process.exit(1);
});
