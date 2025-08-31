#!/usr/bin/env node

/**
 * Fix Frozen Application Script
 * 
 * This script helps diagnose and fix the issue where the application gets stuck
 * at around 205MB memory usage with no activity.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  checkIntervalMs: 3000, // Check every 3 seconds
  maxChecks: 60, // Run for 3 minutes
  timeoutMs: 2000, // Short timeout to detect hanging requests
};

let checkCount = 0;
let frozenDetectionCount = 0;
let lastSuccessfulResponse = Date.now();

// Simple HTTP request utility with strict timeout
function makeRequest(url, options = {}) {
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
        'User-Agent': 'FrozenAppFixer/1.0',
        ...options.headers
      },
      timeout: options.timeout || config.timeoutMs
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: Date.now() - startTime
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    const startTime = Date.now();
    req.end();
  });
}

// Check if application is frozen
async function checkFrozenState() {
  const endpoints = [
    '/api/health',
    '/api/settings/system-settings'
  ];

  const results = [];
  let successfulChecks = 0;
  let totalResponseTime = 0;

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await makeRequest(`${config.baseUrl}${endpoint}`, {
        timeout: config.timeoutMs
      });
      const responseTime = Date.now() - startTime;
      
      results.push({
        endpoint,
        status: response.statusCode,
        responseTime,
        success: response.statusCode === 200
      });

      if (response.statusCode === 200) {
        successfulChecks++;
        totalResponseTime += responseTime;
        lastSuccessfulResponse = Date.now();
      }
    } catch (error) {
      results.push({
        endpoint,
        status: 'ERROR',
        responseTime: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Determine if application is frozen
  const isFrozen = successfulChecks === 0;
  const timeSinceLastSuccess = Date.now() - lastSuccessfulResponse;
  
  if (isFrozen) {
    frozenDetectionCount++;
  }

  return {
    frozen: isFrozen,
    successfulChecks,
    totalResponseTime,
    timeSinceLastSuccess,
    results,
    frozenDetectionCount
  };
}

// Attempt to unfreeze the application
async function attemptUnfreeze() {
  console.log('🔄 Attempting to unfreeze application...');
  
  const unfreezeActions = [
    { name: 'Health Check', url: '/api/health' },
    { name: 'System Settings', url: '/api/settings/system-settings' },
    { name: 'Upload Queue Status', url: '/api/upload-queue/status' },
    { name: 'Database Status', url: '/api/health/db' }
  ];

  for (const action of unfreezeActions) {
    try {
      console.log(`  Trying ${action.name}...`);
      const response = await makeRequest(`${config.baseUrl}${action.url}`, {
        timeout: 5000
      });
      
      if (response.statusCode === 200) {
        console.log(`  ✅ ${action.name} successful`);
        return true;
      } else {
        console.log(`  ❌ ${action.name} failed: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`  ❌ ${action.name} error: ${error.message}`);
    }
  }

  return false;
}

// Main monitoring loop
async function monitorLoop() {
  console.log(`[${new Date().toISOString()}] Starting frozen application fixer...`);
  console.log(`[${new Date().toISOString()}] Will check every ${config.checkIntervalMs}ms for ${config.maxChecks} checks`);
  console.log(`[${new Date().toISOString()}] Base URL: ${config.baseUrl}`);
  console.log(`[${new Date().toISOString()}] Timeout: ${config.timeoutMs}ms`);
  console.log('');
  
  const results = [];
  let unfreezeAttempted = false;
  
  while (checkCount < config.maxChecks) {
    checkCount++;
    
    const result = await checkFrozenState();
    results.push(result);
    
    // Log current status
    const status = result.frozen ? '❌ FROZEN' : '✅ HEALTHY';
    console.log(`[${new Date().toISOString()}] Check ${checkCount}/${config.maxChecks}: ${status}`);
    
    if (result.frozen) {
      console.log(`  Frozen detections: ${result.frozenDetectionCount}`);
      console.log(`  Time since last success: ${Math.round(result.timeSinceLastSuccess / 1000)}s`);
      
      // If frozen state detected and we haven't tried to unfreeze yet
      if (!unfreezeAttempted && result.frozenDetectionCount >= 3) {
        console.log(`[${new Date().toISOString()}] 🚨 Frozen state confirmed! Attempting recovery...`);
        unfreezeAttempted = true;
        
        const unfrozen = await attemptUnfreeze();
        if (unfrozen) {
          console.log(`[${new Date().toISOString()}] ✅ Application recovered successfully!`);
          break;
        } else {
          console.log(`[${new Date().toISOString()}] ❌ Application could not be automatically recovered`);
          console.log(`[${new Date().toISOString()}] Manual intervention required`);
          break;
        }
      }
    } else {
      console.log(`  Successful checks: ${result.successfulChecks}/${result.results.length}`);
      console.log(`  Average response time: ${Math.round(result.totalResponseTime / result.successfulChecks)}ms`);
    }
    
    // Wait before next check
    if (checkCount < config.maxChecks) {
      await new Promise(resolve => setTimeout(resolve, config.checkIntervalMs));
    }
  }
  
  // Summary
  console.log('');
  console.log(`[${new Date().toISOString()}] Monitoring completed. Summary:`);
  console.log(`  Total checks: ${results.length}`);
  console.log(`  Frozen detections: ${results.filter(r => r.frozen).length}`);
  console.log(`  Successful checks: ${results.filter(r => !r.frozen && r.successfulChecks > 0).length}`);
  
  const frozenResults = results.filter(r => r.frozen);
  if (frozenResults.length > 0) {
    console.log(`  Average time frozen: ${Math.round(frozenResults.reduce((sum, r) => sum + (r.timeSinceLastSuccess || 0), 0) / frozenResults.length / 1000)}s`);
  }
  
  // Recommendations
  console.log('');
  console.log(`[${new Date().toISOString()}] Recommendations:`);
  console.log(`  1. Check for SSE connection issues (401 errors)`);
  console.log(`  2. Check for database connection pool exhaustion`);
  console.log(`  3. Check for stuck upload queue processor`);
  console.log(`  4. Check for memory leaks in browser`);
  console.log(`  5. Restart the application if needed`);
  console.log(`  6. Clear browser cache and reload`);
}

// Handle graceful shutdown
function shutdown(signal) {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start monitoring
monitorLoop().catch(error => {
  console.error(`[${new Date().toISOString()}] Fatal error:`, error);
  process.exit(1);
});
