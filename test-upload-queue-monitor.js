#!/usr/bin/env node

// Simple monitoring script for upload queue
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function checkQueueStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/upload-queue/status`);
    const data = await response.json();
    
    console.log('\n=== UPLOAD QUEUE STATUS ===');
    console.log(`Timestamp: ${data.timestamp}`);
    console.log(`Max Concurrent: ${data.maxConcurrent}`);
    console.log(`Current In-Process: ${data.currentInProcess}`);
    console.log(`Is Over Limit: ${data.isOverLimit ? 'YES ⚠️' : 'No ✅'}`);
    
    // Check for concurrent limit violations
    if (data.isOverLimit) {
      console.log(`[WARNING] ⚠️  CONCURRENT LIMIT VIOLATION: ${data.currentInProcess}/${data.maxConcurrent} jobs in process!`);
    }
    
    console.log('\n=== STATUS COUNTS ===');
    Object.entries(data.statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });
    
    if (data.inProcessJobs && data.inProcessJobs.length > 0) {
      console.log('\n=== IN-PROCESS JOBS ===');
      data.inProcessJobs.forEach(job => {
        const processTime = job.process_date ? new Date(job.process_date) : null;
        const duration = processTime ? Math.floor((Date.now() - processTime.getTime()) / 1000) : 0;
        console.log(`- ${job.file_name} (ID: ${job.id}) - Processing for ${duration}s`);
      });
    }
    
    if (data.recentActivity && data.recentActivity.length > 0) {
      console.log('\n=== RECENT ACTIVITY ===');
      data.recentActivity.slice(0, 5).forEach(job => {
        const updatedTime = job.updated_at ? new Date(job.updated_at) : null;
        const timeAgo = updatedTime ? Math.floor((Date.now() - updatedTime.getTime()) / 1000) : 0;
        console.log(`- ${job.file_name} (${job.status}) - Updated ${timeAgo}s ago`);
      });
    }
    
  } catch (error) {
    console.error('Error checking queue status:', error.message);
  }
}

async function checkConcurrentLimit() {
  try {
    const response = await fetch(`${BASE_URL}/api/upload-queue/check-concurrent-limit`);
    if (response.ok) {
      const result = await response.json();
      if (result.isOverLimit) {
        console.log(`[VIOLATION] 🚨 CONCURRENT LIMIT EXCEEDED: ${result.currentInProgress}/${result.maxConcurrent}`);
        console.log(`[VIOLATION] In-process jobs:`, result.inProcessJobs.map(job => job.file_name));
      } else if (result.isAtLimit) {
        console.log(`[LIMIT] 📊 At concurrent limit: ${result.currentInProgress}/${result.maxConcurrent}`);
      } else {
        console.log(`[LIMIT] ✅ Within concurrent limit: ${result.currentInProgress}/${result.maxConcurrent} (${result.availableSlots} slots available)`);
      }
    }
  } catch (error) {
    console.error('[LIMIT] Error checking concurrent limit:', error.message);
  }
}

async function runCleanup() {
  try {
    console.log('\n🧹 Running cleanup...');
    const response = await fetch(`${BASE_URL}/api/upload-queue/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Cleanup completed: ${data.message}`);
      console.log(`Jobs reset: ${data.stuckJobsReset}`);
    } else {
      console.error('❌ Cleanup failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error running cleanup:', error.message);
  }
}

// Main monitoring loop
async function monitor() {
  console.log('🔍 Starting upload queue monitoring...');
  console.log('Press Ctrl+C to stop\n');
  
  // Initial check
  await checkQueueStatus();
  await checkConcurrentLimit();
  
  // Check every 10 seconds
  setInterval(async () => {
    await checkQueueStatus();
    await checkConcurrentLimit();
  }, 10000);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--cleanup')) {
  runCleanup().then(() => process.exit(0));
} else {
  monitor();
} 