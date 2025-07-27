#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.PROCESSOR_API_KEY || 'your-processor-api-key';
const PROCESS_INTERVAL = parseInt(process.env.PROCESS_INTERVAL) || 5000; // 5 seconds
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;

let isRunning = false;
let retryCount = 0;

async function processQueue() {
  if (isRunning) {
    console.log('[PROCESSOR] Skipping - already processing');
    return;
  }

  isRunning = true;
  
  try {
    console.log(`[PROCESSOR] Attempting to process queue at ${new Date().toISOString()}`);
    
    const response = await fetch(`${BASE_URL}/api/upload-queue/process`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[PROCESSOR] ${result.message || 'Process completed'}`);
      retryCount = 0; // Reset retry count on success
    } else {
      const errorText = await response.text();
      console.log(`[PROCESSOR] No jobs to process or limit reached: ${errorText}`);
      retryCount = 0; // Reset retry count for expected responses
    }
    
  } catch (error) {
    retryCount++;
    console.error(`[PROCESSOR] Error processing queue (attempt ${retryCount}/${MAX_RETRIES}):`, error.message);
    
    if (retryCount >= MAX_RETRIES) {
      console.error('[PROCESSOR] Max retries reached, stopping processor');
      process.exit(1);
    }
  } finally {
    isRunning = false;
  }
}

async function checkQueueStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/upload-queue/status`);
    if (response.ok) {
      const status = await response.json();
      console.log(`[STATUS] Queue: ${status.currentInProcess}/${status.maxConcurrent} in process, ${status.statusCounts.queued || 0} queued`);
    }
  } catch (error) {
    console.error('[STATUS] Error checking queue status:', error.message);
  }
}

// Main processing loop
async function startProcessor() {
  console.log(`[PROCESSOR] Starting continuous upload queue processor`);
  console.log(`[PROCESSOR] Base URL: ${BASE_URL}`);
  console.log(`[PROCESSOR] Process interval: ${PROCESS_INTERVAL}ms`);
  console.log(`[PROCESSOR] Max retries: ${MAX_RETRIES}`);
  console.log(`[PROCESSOR] Press Ctrl+C to stop\n`);

  // Initial status check
  await checkQueueStatus();

  // Start processing loop
  setInterval(async () => {
    await processQueue();
  }, PROCESS_INTERVAL);

  // Status check every 30 seconds
  setInterval(async () => {
    await checkQueueStatus();
  }, 30000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[PROCESSOR] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[PROCESSOR] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the processor
startProcessor().catch(error => {
  console.error('[PROCESSOR] Failed to start processor:', error);
  process.exit(1);
}); 