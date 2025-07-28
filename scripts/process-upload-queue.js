#!/usr/bin/env node

/**
 * Upload Queue Processor
 * 
 * This script continuously processes the upload queue by calling the process endpoint.
 * It can be run as a background service to ensure queue processing happens automatically.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  interval: parseInt(process.env.PROCESSOR_INTERVAL_MS || '5000'), // 5 seconds
  maxRetries: 3,
  logInterval: parseInt(process.env.LOG_INTERVAL_MS || '30000'), // 30 seconds
};

let isRunning = false;
let consecutiveErrors = 0;
let lastLogTime = Date.now();

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
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

    req.setTimeout(30000); // 30 second timeout

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function processQueue() {
  if (isRunning) {
    return; // Prevent concurrent processing
  }

  isRunning = true;
  
  try {
    const url = `${config.baseUrl}/api/upload-queue/process`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'User-Agent': 'UploadQueueProcessor/1.0'
      }
    };

    const response = await makeRequest(url, options);
    
    if (response.status === 200) {
      consecutiveErrors = 0;
      
      if (response.data.message === 'No queued jobs') {
        // No jobs to process, this is normal
        if (Date.now() - lastLogTime > config.logInterval) {
          log('No queued jobs to process', 'INFO');
          lastLogTime = Date.now();
        }
      } else if (response.data.job) {
        log(`Processed job: ${response.data.job.file_name} (${response.data.job.status})`, 'INFO');
      } else {
        log('Queue processing completed', 'INFO');
      }
    } else {
      consecutiveErrors++;
      log(`HTTP ${response.status}: ${JSON.stringify(response.data)}`, 'ERROR');
    }
  } catch (error) {
    consecutiveErrors++;
    log(`Processing error: ${error.message}`, 'ERROR');
    
    if (consecutiveErrors >= config.maxRetries) {
      log(`Too many consecutive errors (${consecutiveErrors}), pausing for 30 seconds`, 'WARN');
      await new Promise(resolve => setTimeout(resolve, 30000));
      consecutiveErrors = 0;
    }
  } finally {
    isRunning = false;
  }
}

function startProcessor() {
  log(`Starting Upload Queue Processor`, 'INFO');
  log(`Configuration:`, 'INFO');
  log(`  Base URL: ${config.baseUrl}`, 'INFO');
  log(`  Interval: ${config.interval}ms`, 'INFO');
  log(`  Max Retries: ${config.maxRetries}`, 'INFO');
  log(`  Log Interval: ${config.logInterval}ms`, 'INFO');

  // Initial processing
  processQueue();

  // Set up interval
  setInterval(processQueue, config.interval);

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully...', 'INFO');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully...', 'INFO');
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
    process.exit(1);
  });
}

// Start the processor
startProcessor(); 