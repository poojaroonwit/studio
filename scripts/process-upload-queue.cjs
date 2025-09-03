#!/usr/bin/env node

/**
 * Upload Queue Processor with Dynamic Resource Management
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at regular intervals. It dynamically adjusts its behavior based on available system resources
 * and system settings for concurrent processing.
 * 
 * OPTIMIZED: Reduced processing frequency to prevent database connection exhaustion
 * DYNAMIC: Supports multiple concurrent processors based on system settings
 * OPTIMIZED: Increased intervals for better stability
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const http = require('http');
const os = require('os');

// Dynamic configuration that adjusts based on system resources
let dynamicConfig = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS) || 5000, // ✅ Reduced to 5000 (5 seconds)
  logIntervalMs: parseInt(process.env.LOG_INTERVAL_MS) || 60000,
  batchLimit: parseInt(process.env.PROCESSOR_BATCH_LIMIT) || 1, // ✅ Reduced from 3 to 1
  maxRetries: 3,
  retryDelayMs: 10000,
  quietMode: process.env.PROCESSOR_QUIET_MODE === 'true' || false,
  maxConsecutiveErrors: 3,
  backoffMultiplier: 1.5,
  maxBackoffMs: 600000,
  connectionTimeoutMs: parseInt(process.env.PROCESSOR_CONNECTION_TIMEOUT_MS) || 60000,
  requestTimeoutMs: parseInt(process.env.PROCESSOR_REQUEST_TIMEOUT_MS) || 180000,
  
  // Dynamic adjustment factors
  cpuThreshold: 80, // CPU usage threshold for scaling down
  memoryThreshold: 85, // Memory usage threshold for scaling down
  healthCheckInterval: 5000, // How often to check system health
  
  // Concurrent processing settings
  maxConcurrentProcessors: parseInt(process.env.MAX_CONCURRENT_PROCESSORS) || 1, // Default to 1 for connection optimization
  currentConcurrentProcessors: 1, // Current active processors
  processorCheckInterval: 60000, // Check system settings every minute
};

// State
let isRunning = true;
let lastLogTime = Date.now();
let processedCount = 0;
let errorCount = 0;
let consecutiveErrors = 0;
let currentBackoffMs = dynamicConfig.retryDelayMs;
const startTime = Date.now();
let lastHealthCheck = Date.now();
let lastProcessorCheck = Date.now();
let currentPressureLevel = 'medium';

// Override baseUrl for local development if it's set to Docker service name
if (dynamicConfig.baseUrl.includes('8021_fitscan_app:8021') || dynamicConfig.baseUrl.includes('172.21.0.2:8021')) {
  if (process.env.DOCKER_ENV || process.env.NODE_ENV === 'production') {
    console.log(`[INFO] Running in Docker/production environment, using: ${dynamicConfig.baseUrl}`);
  } else {
    dynamicConfig.baseUrl = 'http://localhost:8021';
    console.log(`[INFO] Overriding PROCESSOR_URL to localhost for local development: ${dynamicConfig.baseUrl}`);
  }
}

// Get system setting for max concurrent processors
async function getMaxConcurrentProcessorsSetting() {
  try {
    const response = await makeRequest(`${dynamicConfig.baseUrl}/api/settings/system-settings`, {
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
    console.log(`[PROCESSOR] Failed to get maxConcurrentProcessors setting: ${error.message}`);
  }
  
  // Fallback to environment variable or default
  return parseInt(process.env.MAX_CONCURRENT_PROCESSORS) || 1;
}

// Update concurrent processor setting from system settings
async function updateConcurrentProcessorSetting() {
  try {
    const maxConcurrent = await getMaxConcurrentProcessorsSetting();
    if (maxConcurrent !== dynamicConfig.maxConcurrentProcessors) {
      const oldValue = dynamicConfig.maxConcurrentProcessors;
      dynamicConfig.maxConcurrentProcessors = maxConcurrent;
      console.log(`[PROCESSOR] Updated max concurrent processors: ${oldValue} → ${maxConcurrent}`);
      
      // Adjust batch limit based on concurrent processors
      const newBatchLimit = Math.max(1, Math.min(maxConcurrent, 5)); // Cap at 5 for connection safety
      if (newBatchLimit !== dynamicConfig.batchLimit) {
        dynamicConfig.batchLimit = newBatchLimit;
        console.log(`[PROCESSOR] Adjusted batch limit: ${newBatchLimit} (based on ${maxConcurrent} concurrent processors)`);
      }
    }
  } catch (error) {
    console.log(`[PROCESSOR] Error updating concurrent processor setting: ${error.message}`);
  }
}

// Resource monitoring functions
function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsagePercent = (usedMem / totalMem) * 100;
  
  // Simplified CPU usage calculation
  const cpuUsage = process.cpuUsage();
  const loadAvg = os.loadavg()[0]; // 1-minute load average
  
  return {
    memory: {
      used: usedMem,
      total: totalMem,
      percentage: memoryUsagePercent,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    },
    cpu: {
      usage: cpuUsage,
      load: loadAvg,
      cores: os.cpus().length
    }
  };
}

function calculateResourcePressure(metrics) {
  const memoryPressure = metrics.memory.percentage / 100;
  const cpuPressure = Math.min(1, metrics.cpu.load / metrics.cpu.cores);
  
  // Combined pressure score (0-1, higher is more pressure)
  const pressureScore = (memoryPressure + cpuPressure) / 2;
  
  if (pressureScore < 0.3) return 'low';
  if (pressureScore < 0.6) return 'medium';
  if (pressureScore < 0.8) return 'high';
  return 'critical';
}

function adjustConfiguration(pressure) {
  const baseInterval = parseInt(process.env.PROCESSOR_INTERVAL_MS) || 5000;
  const baseBatchSize = dynamicConfig.maxConcurrentProcessors; // Use system setting as base
  
  // Adjustment multipliers based on pressure
  const adjustments = {
    low: {
      interval: 0.8, // 20% faster processing
      batchSize: 1.2, // 20% larger batches
      timeout: 0.8, // 20% shorter timeouts
      retries: 0.8 // 20% fewer retries
    },
    medium: {
      interval: 1.0, // Normal processing
      batchSize: 1.0, // Normal batch size
      timeout: 1.0, // Normal timeouts
      retries: 1.0 // Normal retries
    },
    high: {
      interval: 1.5, // 50% slower processing
      batchSize: 0.8, // 20% smaller batches
      timeout: 1.5, // 50% longer timeouts
      retries: 1.2 // 20% more retries
    },
    critical: {
      interval: 2.5, // 150% slower processing
      batchSize: 0.5, // 50% smaller batches
      timeout: 2.0, // 100% longer timeouts
      retries: 1.5 // 50% more retries
    }
  };
  
  const adj = adjustments[pressure];
  
  return {
    intervalMs: Math.round(baseInterval * adj.interval),
    batchLimit: Math.max(1, Math.min(dynamicConfig.maxConcurrentProcessors, Math.round(baseBatchSize * adj.batchSize))),
    connectionTimeoutMs: Math.round(dynamicConfig.connectionTimeoutMs * adj.timeout),
    requestTimeoutMs: Math.round(dynamicConfig.requestTimeoutMs * adj.timeout),
    retryDelayMs: Math.round(dynamicConfig.retryDelayMs * adj.retries),
    maxConsecutiveErrors: Math.max(2, Math.round(dynamicConfig.maxConsecutiveErrors * adj.retries))
  };
}

function updateDynamicConfig() {
  const metrics = getSystemMetrics();
  const pressure = calculateResourcePressure(metrics);
  
  if (pressure !== currentPressureLevel) {
    const oldLevel = currentPressureLevel;
    currentPressureLevel = pressure;
    
    const newConfig = adjustConfiguration(pressure);
    
    // Update configuration
    dynamicConfig.intervalMs = newConfig.intervalMs;
    dynamicConfig.batchLimit = newConfig.batchLimit;
    dynamicConfig.connectionTimeoutMs = newConfig.connectionTimeoutMs;
    dynamicConfig.requestTimeoutMs = newConfig.requestTimeoutMs;
    dynamicConfig.retryDelayMs = newConfig.retryDelayMs;
    dynamicConfig.maxConsecutiveErrors = newConfig.maxConsecutiveErrors;
    
    console.log(`[PROCESSOR] Resource pressure changed: ${oldLevel} → ${pressure}`);
    console.log(`[PROCESSOR] Adjusted config: interval=${dynamicConfig.intervalMs}ms, batch=${dynamicConfig.batchLimit}, timeouts=${dynamicConfig.connectionTimeoutMs}ms`);
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
  } else if (!dynamicConfig.quietMode) {
    console.log(logMessage);
  }
  
  // Log status every logIntervalMs
  if (Date.now() - lastLogTime > dynamicConfig.logIntervalMs) {
    const metrics = getSystemMetrics();
    console.log(`[STATUS] Processor running - Processed: ${processedCount}, Errors: ${errorCount}, Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`);
    console.log(`[RESOURCES] Memory: ${metrics.memory.percentage.toFixed(1)}%, CPU Load: ${metrics.cpu.load.toFixed(2)}, Pressure: ${currentPressureLevel}`);
    console.log(`[CONFIG] Max Concurrent: ${dynamicConfig.maxConcurrentProcessors}, Current Batch: ${dynamicConfig.batchLimit}, Interval: ${dynamicConfig.intervalMs}ms`);
    lastLogTime = Date.now();
  }
}

// HTTP request utility with dynamic timeouts
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
        'x-api-key': dynamicConfig.apiKey,
        ...options.headers
      },
      timeout: dynamicConfig.requestTimeoutMs,
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
      console.log(`[DEBUG] HTTP request timeout after ${dynamicConfig.requestTimeoutMs}ms for ${url}`);
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(dynamicConfig.connectionTimeoutMs, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Process a batch of jobs with dynamic batch size
async function processBatch() {
  try {
    const response = await makeRequest(`${dynamicConfig.baseUrl}/api/upload-queue/process-all?limit=${dynamicConfig.batchLimit}`, {
      method: 'POST'
    });

    if (response.status === 200) {
      const processedCount = response.data.processed_count || 0;
      const msgs = response.data.messages || [];
      
      // Only log if jobs were actually processed
      if (processedCount > 0) {
        log('INFO', `Processed ${processedCount} jobs (batch size: ${dynamicConfig.batchLimit}, max concurrent: ${dynamicConfig.maxConcurrentProcessors})`);
        consecutiveErrors = 0;
        currentBackoffMs = dynamicConfig.retryDelayMs;
        lastSuccessfulProcessing = Date.now();
      } else if (msgs.some(m => (m || '').includes('No queued jobs'))) {
        // Don't log empty batches to reduce noise
        consecutiveErrors = 0;
        currentBackoffMs = dynamicConfig.retryDelayMs;
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
    
    // Implement exponential backoff with dynamic retry delay
    if (consecutiveErrors >= dynamicConfig.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * dynamicConfig.backoffMultiplier, dynamicConfig.maxBackoffMs);
      log('WARN', `Too many consecutive errors, backing off for ${currentBackoffMs}ms`);
    }
    
    return 0;
  }
}

// Process a single job (fallback)
async function processJob() {
  try {
    const response = await makeRequest(`${dynamicConfig.baseUrl}/api/upload-queue/process`, {
      method: 'POST'
    });

    if (response.status === 200) {
      log('INFO', 'Processed single job successfully');
      consecutiveErrors = 0;
      currentBackoffMs = dynamicConfig.retryDelayMs;
      return 1;
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', `Failed to process single job: ${error.message}`);
    
    if (consecutiveErrors >= dynamicConfig.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * dynamicConfig.backoffMultiplier, dynamicConfig.maxBackoffMs);
    }
    
    return 0;
  }
}

// Main processing loop with dynamic intervals
async function processLoop() {
  while (isRunning) {
    try {
      // Check system resources and update configuration
      if (Date.now() - lastHealthCheck > dynamicConfig.healthCheckInterval) {
        updateDynamicConfig();
        lastHealthCheck = Date.now();
      }
      
      // Check system settings for concurrent processors
      if (Date.now() - lastProcessorCheck > dynamicConfig.processorCheckInterval) {
        await updateConcurrentProcessorSetting();
        lastProcessorCheck = Date.now();
      }
      
      const count = await processBatch();
      
      // Use dynamic backoff based on error state and resource pressure
      const waitTime = consecutiveErrors >= dynamicConfig.maxConsecutiveErrors ? currentBackoffMs : dynamicConfig.intervalMs;
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      log('ERROR', `Unexpected error in process loop: ${error.message}`);
      
      consecutiveErrors++;
      
      if (consecutiveErrors >= dynamicConfig.maxConsecutiveErrors) {
        currentBackoffMs = Math.min(currentBackoffMs * dynamicConfig.backoffMultiplier, dynamicConfig.maxBackoffMs);
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
log('INFO', `Upload Queue Processor starting with max concurrent: ${dynamicConfig.maxConcurrentProcessors}`);
log('INFO', `Configuration: interval=${dynamicConfig.intervalMs}ms, batch=${dynamicConfig.batchLimit}, timeouts=${dynamicConfig.connectionTimeoutMs}ms`);

processLoop().catch(error => {
  log('ERROR', `Fatal error in process loop: ${error.message}`);
  process.exit(1);
});
