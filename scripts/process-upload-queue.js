#!/usr/bin/env node

/**
 * Upload Queue Processor
 * 
 * This script continuously processes the upload queue by calling the process endpoint.
 * It can be run as a background service to ensure queue processing happens automatically.
 */

import https from 'https';
import http from 'http';

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
    let processedJobs = 0;
    let maxAttempts = 10; // Prevent infinite loops
    let attempt = 0;
    
    // Process multiple jobs until no more can be processed
    while (attempt < maxAttempts) {
      attempt++;
      
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
          if (processedJobs === 0 && Date.now() - lastLogTime > config.logInterval) {
            log('No queued jobs to process', 'INFO');
            lastLogTime = Date.now();
          }
          break; // Exit the loop
        } else if (response.data.message && response.data.message.includes('no available slots')) {
          // No available slots, wait a bit and try again
          log(`No available slots (${response.data.currentInProgress}/${response.data.maxConcurrent}), waiting...`, 'INFO');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          break; // Exit the loop
        } else if (response.data.job) {
          processedJobs++;
          log(`Processed job: ${response.data.job.file_name} (${response.data.job.status})`, 'INFO');
          
          // Small delay between jobs to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          log('Queue processing completed', 'INFO');
          break; // Exit the loop
        }
      } else {
        consecutiveErrors++;
        log(`HTTP ${response.status}: ${JSON.stringify(response.data)}`, 'ERROR');
        break; // Exit the loop on error
      }
    }
    
    if (processedJobs > 0) {
      log(`Processing cycle completed: ${processedJobs} jobs processed`, 'INFO');
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