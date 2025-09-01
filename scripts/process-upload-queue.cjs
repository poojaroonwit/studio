#!/usr/bin/env node

/**
 * Upload Queue Processor with Dynamic Resource Management
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at regular intervals. It dynamically adjusts its behavior based on available system resources.
 * 
 * DYNAMIC: Automatically adjusts processing frequency, batch sizes, and timeouts based on CPU, memory, and database health
 * OPTIMIZED: Reduces processing frequency to prevent application from getting stuck
 * OPTIMIZED: Increased intervals and reduced batch processing for better stability
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
  intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS) || 30000, // Increased from 10000 to 30000 (30 seconds)
  logIntervalMs: parseInt(process.env.LOG_INTERVAL_MS) || 60000,
  batchLimit: parseInt(process.env.PROCESSOR_BATCH_LIMIT) || 1, // Reduced from 3 to 1
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
  healthCheckInterval: 30000, // How often to check system health
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
  const baseInterval = parseInt(process.env.PROCESSOR_INTERVAL_MS) || 10000;
  const baseBatchSize = parseInt(process.env.PROCESSOR_BATCH_LIMIT) || 3;
  
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
    batchLimit: Math.max(1, Math.round(baseBatchSize * adj.batchSize)),
    connectionTimeoutMs: Math.round(dynamicConfig.connectionTimeoutMs * adj.timeout),
    requestTimeoutMs: Math.round(dynamicConfig.requestTimeoutMs * adj.timeout),
    retryDelayMs: Math.round(dynamicConfig.retryDelayMs * adj.retries),
    maxConsecutiveErrors: Math.max(2, Math.round(dynamicConfig.maxConsecutiveErrors * adj.retries))
  };
}

function updateDynamicConfig() {
  const metrics = getSystemMetrics();
  const pressure = calculateResourcePressure(metrics);
  
  // Only update if pressure level changed
  if (pressure !== currentPressureLevel) {
    const newConfig = adjustConfiguration(pressure);
    
    // Update configuration
    Object.assign(dynamicConfig, newConfig);
    currentPressureLevel = pressure;
    
    console.log(`📊 Resource pressure changed to: ${pressure}`);
    console.log(`⚙️  Adjusted configuration:`, {
      interval: `${dynamicConfig.intervalMs}ms`,
      batchSize: dynamicConfig.batchLimit,
      connectionTimeout: `${dynamicConfig.connectionTimeoutMs}ms`,
      requestTimeout: `${dynamicConfig.requestTimeoutMs}ms`,
      retryDelay: `${dynamicConfig.retryDelayMs}ms`,
      maxErrors: dynamicConfig.maxConsecutiveErrors
    });
    
    console.log(`📈 System metrics:`, {
      memory: `${metrics.memory.percentage.toFixed(1)}%`,
      cpuLoad: metrics.cpu.load.toFixed(2),
      heapUsed: `${(metrics.memory.heapUsed / 1024 / 1024).toFixed(1)}MB`
    });
  }
}

// Simplified logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  
  // Skip verbose INFO logs in quiet mode
  if (dynamicConfig.quietMode && level === 'INFO' && 
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
  
  // Periodic status logging with resource information
  if (level === 'INFO' && Date.now() - lastLogTime > dynamicConfig.logIntervalMs) {
    const metrics = getSystemMetrics();
    console.log(`[STATUS] Processor running - Processed: ${processedCount}, Errors: ${errorCount}, Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`);
    console.log(`[RESOURCES] Memory: ${metrics.memory.percentage.toFixed(1)}%, CPU Load: ${metrics.cpu.load.toFixed(2)}, Pressure: ${currentPressureLevel}`);
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
        log('INFO', `Processed ${processedCount} jobs (batch size: ${dynamicConfig.batchLimit})`);
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
      if (response.data.job) {
        const job = response.data.job;
        log('INFO', `Processed job ${job.id} (${job.file_name}) - Status: ${job.status}`);
        
        if (job.status === 'success') {
          processedCount++;
          consecutiveErrors = 0;
          currentBackoffMs = dynamicConfig.retryDelayMs;
          lastSuccessfulProcessing = Date.now();
        } else {
          errorCount++;
          consecutiveErrors++;
        }
      } else if (response.data.message === 'No queued jobs') {
        consecutiveErrors = 0;
        currentBackoffMs = dynamicConfig.retryDelayMs;
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    errorCount++;
    consecutiveErrors++;
    log('ERROR', `Failed to process job: ${error.message}`);
    
    if (consecutiveErrors >= dynamicConfig.maxConsecutiveErrors) {
      currentBackoffMs = Math.min(currentBackoffMs * dynamicConfig.backoffMultiplier, dynamicConfig.maxBackoffMs);
    }
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
  
  setTimeout(() => {
    const metrics = getSystemMetrics();
    log('INFO', `Processor shutdown complete - Total processed: ${processedCount}, Total errors: ${errorCount}`);
    log('INFO', `Final resource state - Memory: ${metrics.memory.percentage.toFixed(1)}%, CPU Load: ${metrics.cpu.load.toFixed(2)}`);
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
log('INFO', 'Dynamic upload queue processor starting', {
  config: {
    baseUrl: dynamicConfig.baseUrl,
    baseIntervalMs: dynamicConfig.intervalMs,
    baseBatchLimit: dynamicConfig.batchLimit,
    maxRetries: dynamicConfig.maxRetries,
    retryDelayMs: dynamicConfig.retryDelayMs,
    maxConsecutiveErrors: dynamicConfig.maxConsecutiveErrors,
    maxBackoffMs: dynamicConfig.maxBackoffMs,
    connectionTimeoutMs: dynamicConfig.connectionTimeoutMs,
    requestTimeoutMs: dynamicConfig.requestTimeoutMs,
    healthCheckInterval: dynamicConfig.healthCheckInterval
  }
});

// Initial resource check
updateDynamicConfig();

processLoop().catch((error) => {
  log('ERROR', `Fatal error in process loop: ${error.message}`);
  process.exit(1);
});
