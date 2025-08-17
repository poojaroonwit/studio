#!/usr/bin/env node

/**
 * Upload Queue Processor
 * 
 * This script automatically processes the upload queue by calling the process endpoint
 * at regular intervals. It runs continuously and handles graceful shutdown.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  intervalMs: parseInt(process.env.PROCESSOR_INTERVAL_MS) || 5000,
  logIntervalMs: parseInt(process.env.LOG_INTERVAL_MS) || 30000,
  maxRetries: 3,
  retryDelayMs: 1000
};

// State
let isRunning = true;
let lastLogTime = Date.now();
let processedCount = 0;
let errorCount = 0;
let consecutiveErrors = 0;

// Logging utility
function log(level, message, data = {}) {
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

// Main processing loop
async function processLoop() {
  while (isRunning) {
    try {
      await processJob();
      
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
