#!/usr/bin/env node

/**
 * Upload Queue Processor with Fixed Timing
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at fixed intervals. It uses consistent timing based on environment configuration.
 * 
 * OPTIMIZED: Fixed processing frequency for predictable behavior
 * SIMPLIFIED: No dynamic resource management - consistent performance
 * STABLE: Predictable intervals regardless of system load
 * 
 * TIMEOUT CONFIGURATION:
 * - requestTimeoutMs: Must be >= webhook processing timeout (default 30 minutes)
 * - connectionTimeoutMs: Network connection timeout (default 30 seconds)
 * - The request timeout should match the webhook timeout to prevent premature timeouts
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const http = require('http');

// Fixed configuration - no dynamic adjustments
let config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS) || 2000, // Fixed interval from environment
  logIntervalMs: parseInt(process.env.LOG_INTERVAL_MS) || 60000,
  batchLimit: parseInt(process.env.PROCESSOR_BATCH_LIMIT) || 1,
  maxRetries: 3,
  retryDelayMs: 10000,
  quietMode: process.env.PROCESSOR_QUIET_MODE === 'true' || false,
  maxConsecutiveErrors: 10, // Increased to prevent stopping on temporary issues
  backoffMultiplier: 1.2, // Reduced backoff multiplier for faster recovery
  maxBackoffMs: 300000, // Increased to 5 minutes for better resilience
  connectionTimeoutMs: parseInt(process.env.PROCESSOR_CONNECTION_TIMEOUT_MS) || 30000, // Connection timeout (30s)
  requestTimeoutMs: parseInt(process.env.PROCESSOR_REQUEST_TIMEOUT_MS) || 1800000, // Request timeout (30min) - must match webhook processing timeout
  
  // Concurrent processing settings
  maxConcurrentProcessors: parseInt(process.env.MAX_CONCURRENT_PROCESSORS) || 1,
  processorCheckInterval: 60000, // Check system settings every minute
};

// State
let isRunning = true;
let lastLogTime = Date.now();
let processedCount = 0;
let errorCount = 0;
let consecutiveErrors = 0;
let currentBackoffMs = config.retryDelayMs;
const startTime = Date.now();
let lastProcessorCheck = Date.now();
let lastSuccessfulRequest = Date.now();

// Circuit breaker state
let circuitBreakerOpen = false;
let circuitBreakerOpenTime = 0;
const CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
const CIRCUIT_BREAKER_THRESHOLD = 20; // Open circuit after 20 consecutive errors

// Override baseUrl for local development if it's set to Docker service name
if (config.baseUrl.includes('8021_fitscan_app:8021') || config.baseUrl.includes('172.21.0.2:8021')) {
  if (process.env.DOCKER_ENV || process.env.NODE_ENV === 'production') {
    // Keep Docker service name in production
  } else {
    config.baseUrl = 'http://localhost:8021';
  }
}

// Get system setting for max concurrent processors
async function getMaxConcurrentProcessorsSetting() {
  try {
    const response = await makeRequest(`${config.baseUrl}/api/settings/system-settings`, {
      method: 'GET'
    });
    
    if (response.status === 200 && response.data) {
      // Look for maxConcurrentProcessors in the settings
      const settings = response.data;
      if (settings.maxConcurrentProcessors) {
        const maxConcurrent = parseInt(settings.maxConcurrentProcessors);
        if (!isNaN(maxConcurrent) && maxConcurrent > 0) {
          return maxConcurrent;
        }
      }
    }
  } catch (error) {
    // Silently fail and use default
  }
  
  // Fallback to environment variable or default
  return parseInt(process.env.MAX_CONCURRENT_PROCESSORS) || 1;
}

// Update concurrent processor setting from system settings
async function updateConcurrentProcessorSetting() {
  try {
    const maxConcurrent = await getMaxConcurrentProcessorsSetting();
    if (maxConcurrent !== config.maxConcurrentProcessors) {
      const oldValue = config.maxConcurrentProcessors;
      config.maxConcurrentProcessors = maxConcurrent;
      
      // Adjust batch limit based on concurrent processors
      const newBatchLimit = Math.max(1, Math.min(maxConcurrent, 5)); // Cap at 5 for connection safety
      if (newBatchLimit !== config.batchLimit) {
        config.batchLimit = newBatchLimit;
        log('INFO', `Updated batch limit from ${oldValue} to ${newBatchLimit} based on concurrent processors`);
      }
    }
  } catch (error) {
    // Silently fail and continue with current settings
  }
}

// Logging function
function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (level === 'ERROR') {
    console.error(logMessage);
  } else if (level === 'WARN') {
    console.warn(logMessage);
  } else if (!config.quietMode) {
    console.log(logMessage);
  }
  
  // Log status every logIntervalMs (FIXED: No recursive call)
  if (Date.now() - lastLogTime > config.logIntervalMs) {
    // Enhanced status logging with circuit breaker state
    const circuitBreakerStatus = circuitBreakerOpen ? `, circuit_breaker=OPEN` : `, circuit_breaker=CLOSED`;
    const statusMessage = `[${timestamp}] [INFO] Status: processed=${processedCount}, errors=${errorCount}, consecutive_errors=${consecutiveErrors}${circuitBreakerStatus}`;
    if (!config.quietMode) {
      console.log(statusMessage);
    }
    lastLogTime = Date.now();
  }
}

// HTTP request utility with fixed timeouts
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
      req.destroy();
      reject(error);
    });
    
    req.on('timeout', () => {
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

// Process a batch of jobs with fixed batch size
async function processBatch() {
  // Check circuit breaker
  if (circuitBreakerOpen) {
    const timeSinceOpen = Date.now() - circuitBreakerOpenTime;
    if (timeSinceOpen < CIRCUIT_BREAKER_TIMEOUT) {
      log('WARN', `Circuit breaker open, waiting ${Math.round((CIRCUIT_BREAKER_TIMEOUT - timeSinceOpen) / 1000)}s before retry`);
      return 0;
    } else {
      // Reset circuit breaker
      circuitBreakerOpen = false;
      consecutiveErrors = 0;
      currentBackoffMs = config.retryDelayMs;
      log('INFO', 'Circuit breaker reset, attempting to process jobs');
    }
  }

  try {
    const response = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=${config.batchLimit}`, {
      method: 'POST'
    });

    if (response.status === 200) {
      const processedCount = response.data.processed_count || 0;
      const msgs = response.data.messages || [];
      
      // Reset consecutive errors on any successful response (even if no jobs processed)
      consecutiveErrors = 0;
      currentBackoffMs = config.retryDelayMs;
      lastSuccessfulRequest = Date.now();
      
      // Reset circuit breaker on success
      if (circuitBreakerOpen) {
        circuitBreakerOpen = false;
        log('INFO', 'Circuit breaker closed due to successful request');
      }
      
      // Reset force exit counter on success
      if (forceExitCount > 0) {
        forceExitCount = 0;
      }
      
      // Only log if jobs were actually processed
      if (processedCount > 0) {
        log('INFO', `Processed ${processedCount} jobs (batch size: ${config.batchLimit}, max concurrent: ${config.maxConcurrentProcessors})`);
      } else if (msgs.some(m => (m || '').includes('No queued jobs'))) {
        // Don't log empty batches to reduce noise
      } else if (response.data.failed_jobs_count > 0) {
        // Log when there are failed jobs but no queued jobs
        log('INFO', `No queued jobs available. ${response.data.failed_jobs_count} failed jobs exist.`);
      }
      
      return processedCount;
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', `Failed to process batch: ${error.message}`);
    
    // Check if we should open the circuit breaker
    if (consecutiveErrors >= CIRCUIT_BREAKER_THRESHOLD && !circuitBreakerOpen) {
      circuitBreakerOpen = true;
      circuitBreakerOpenTime = Date.now();
      log('WARN', `Circuit breaker opened due to ${consecutiveErrors} consecutive errors`);
    }
    
    // Implement exponential backoff with fixed retry delay
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
      log('WARN', `Too many consecutive errors (${consecutiveErrors}), backing off for ${Math.round(currentBackoffMs/1000)}s`);
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
      // Reset consecutive errors on any successful response
      consecutiveErrors = 0;
      currentBackoffMs = config.retryDelayMs;
      lastSuccessfulRequest = Date.now();
      
      // Check if the response indicates no queued jobs
      if (response.data && (response.data.message === 'No queued jobs' || response.data.message === 'No queued jobs available')) {
        // Don't log empty single job attempts to reduce noise
        return 0; // Return 0 to indicate no jobs were processed
      } else {
        log('INFO', 'Processed single job successfully');
        return 1;
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', `Failed to process single job: ${error.message}`);
    
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
    }
    
    return 0;
  }
}

// Main processing loop with fixed intervals
async function processLoop() {
  while (isRunning) {
    try {
      // Check system settings for concurrent processors
      if (Date.now() - lastProcessorCheck > config.processorCheckInterval) {
        await updateConcurrentProcessorSetting();
        lastProcessorCheck = Date.now();
      }
      
      // Safety mechanism: Reset backoff if no successful request for too long
      const timeSinceLastSuccess = Date.now() - lastSuccessfulRequest;
      if (timeSinceLastSuccess > 300000) { // 5 minutes
        log('WARN', `No successful requests for ${Math.round(timeSinceLastSuccess/1000)}s, resetting backoff and circuit breaker`);
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs;
        lastSuccessfulRequest = Date.now();
        
        // Reset circuit breaker as well
        if (circuitBreakerOpen) {
          circuitBreakerOpen = false;
          log('INFO', 'Circuit breaker reset due to safety mechanism');
        }
      }
      
      const count = await processBatch();
      
      // Use fixed interval with error backoff only
      const waitTime = consecutiveErrors >= config.maxConsecutiveErrors ? currentBackoffMs : config.intervalMs;
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      log('ERROR', `Unexpected error in process loop: ${error.message}`);
      
      consecutiveErrors++;
      
      // Check if we should open the circuit breaker
      if (consecutiveErrors >= CIRCUIT_BREAKER_THRESHOLD && !circuitBreakerOpen) {
        circuitBreakerOpen = true;
        circuitBreakerOpenTime = Date.now();
        log('WARN', `Circuit breaker opened due to ${consecutiveErrors} consecutive errors in main loop`);
      }
      
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        currentBackoffMs = Math.min(currentBackoffMs * config.backoffMultiplier, config.maxBackoffMs);
      }
      
      // Never exit the loop - always continue processing
      log('INFO', `Continuing processing after error, will retry in ${Math.round(currentBackoffMs/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, currentBackoffMs));
    }
  }
}

// Graceful shutdown - but don't actually exit
function shutdown(signal) {
  log('INFO', `Received ${signal}, but continuing to run for resilience`);
  log('INFO', 'Process will continue running. Use Ctrl+C multiple times to force exit if needed.');
  // Don't set isRunning = false and don't exit
  // This ensures the process continues running even on shutdown signals
}

// Force exit counter for emergency shutdown
let forceExitCount = 0;
const FORCE_EXIT_THRESHOLD = 3; // Press Ctrl+C 3 times to force exit

// Signal handlers
process.on('SIGINT', () => {
  forceExitCount++;
  if (forceExitCount >= FORCE_EXIT_THRESHOLD) {
    log('INFO', `Force exit triggered after ${forceExitCount} signals`);
    process.exit(0);
  } else {
    shutdown(`SIGINT (${forceExitCount}/${FORCE_EXIT_THRESHOLD})`);
  }
});

process.on('SIGTERM', () => {
  forceExitCount++;
  if (forceExitCount >= FORCE_EXIT_THRESHOLD) {
    log('INFO', `Force exit triggered after ${forceExitCount} signals`);
    process.exit(0);
  } else {
    shutdown(`SIGTERM (${forceExitCount}/${FORCE_EXIT_THRESHOLD})`);
  }
});

// Start the processor
log('INFO', `Upload Queue Processor starting with NEVER-STOP resilience`);
log('INFO', `Configuration: interval=${config.intervalMs}ms, batch=${config.batchLimit}, connection_timeout=${config.connectionTimeoutMs}ms, request_timeout=${config.requestTimeoutMs}ms`);
log('INFO', `Resilience: max_consecutive_errors=${config.maxConsecutiveErrors}, circuit_breaker_threshold=${CIRCUIT_BREAKER_THRESHOLD}, max_backoff=${config.maxBackoffMs}ms`);
log('INFO', `Process will NEVER stop automatically. Press Ctrl+C ${FORCE_EXIT_THRESHOLD} times to force exit.`);

// Enhanced error handling - never exit the process
processLoop().catch(error => {
  log('ERROR', `Fatal error in process loop: ${error.message}`);
  log('INFO', 'Restarting process loop in 30 seconds...');
  
  // Wait 30 seconds and restart the loop
  setTimeout(() => {
    log('INFO', 'Restarting process loop after fatal error');
    processLoop().catch(restartError => {
      log('ERROR', `Failed to restart process loop: ${restartError.message}`);
      log('INFO', 'Will attempt restart again in 60 seconds...');
      setTimeout(() => {
        processLoop().catch(() => {
          log('ERROR', 'Multiple restart attempts failed, but process will continue running');
        });
      }, 60000);
    });
  }, 30000);
});
