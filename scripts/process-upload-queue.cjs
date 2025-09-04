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
  maxConsecutiveErrors: 3,
  backoffMultiplier: 1.5,
  maxBackoffMs: 60000, // Reduced from 10 minutes to 1 minute
  connectionTimeoutMs: parseInt(process.env.PROCESSOR_CONNECTION_TIMEOUT_MS) || 60000,
  requestTimeoutMs: parseInt(process.env.PROCESSOR_REQUEST_TIMEOUT_MS) || 180000,
  
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
  
  // Log status every logIntervalMs
  if (Date.now() - lastLogTime > config.logIntervalMs) {
    // Simplified status logging without system metrics
    log('INFO', `Status: processed=${processedCount}, errors=${errorCount}, consecutive_errors=${consecutiveErrors}`);
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
      
      // Only log if jobs were actually processed
      if (processedCount > 0) {
        log('INFO', `Processed ${processedCount} jobs (batch size: ${config.batchLimit}, max concurrent: ${config.maxConcurrentProcessors})`);
      } else if (msgs.some(m => (m || '').includes('No queued jobs'))) {
        // Don't log empty batches to reduce noise
      }
      
      return processedCount;
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', `Failed to process batch: ${error.message}`);
    
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
      if (response.data && response.data.message === 'No queued jobs') {
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
        log('WARN', `No successful requests for ${Math.round(timeSinceLastSuccess/1000)}s, resetting backoff`);
        consecutiveErrors = 0;
        currentBackoffMs = config.retryDelayMs;
        lastSuccessfulRequest = Date.now();
      }
      
      const count = await processBatch();
      
      // Use fixed interval with error backoff only
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
  process.exit(0);
}

// Signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the processor
log('INFO', `Upload Queue Processor starting with fixed timing`);
log('INFO', `Configuration: interval=${config.intervalMs}ms, batch=${config.batchLimit}, timeouts=${config.connectionTimeoutMs}ms`);

processLoop().catch(error => {
  log('ERROR', `Fatal error in process loop: ${error.message}`);
  process.exit(1);
});
