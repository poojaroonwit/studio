#!/usr/bin/env node

/**
 * Frozen Application Debug Script
 * 
 * This script helps diagnose and fix the issue where the application gets stuck
 * with no resource leak and no activity - just completely frozen.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  checkIntervalMs: 5000, // Check every 5 seconds
  maxChecks: 120, // Run for 10 minutes
  timeoutMs: 3000, // Shorter timeout to detect hanging requests
  healthCheckTimeoutMs: 10000, // Timeout for health checks
};

let checkCount = 0;
let startTime = Date.now();
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
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: config.timeoutMs,
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
            responseTime: Date.now() - startTime
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            responseTime: Date.now() - startTime
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout - possible frozen state'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Check for frozen application state
async function checkFrozenState() {
  const checks = [];
  let hasSuccessfulResponse = false;
  
  try {
    console.log(`[${new Date().toISOString()}] Checking for frozen application state...`);
    
    // Check basic health endpoint
    try {
      const healthResponse = await makeRequest(`${config.baseUrl}/api/health`);
      checks.push({
        endpoint: '/api/health',
        status: healthResponse.status,
        responseTime: healthResponse.responseTime,
        success: healthResponse.status === 200
      });
      if (healthResponse.status === 200) {
        hasSuccessfulResponse = true;
        lastSuccessfulResponse = Date.now();
      }
    } catch (error) {
      checks.push({
        endpoint: '/api/health',
        status: 'TIMEOUT/ERROR',
        error: error.message,
        success: false
      });
    }
    
    // Check if application is responding to simple requests
    try {
      const simpleResponse = await makeRequest(`${config.baseUrl}/api/settings/system-settings`);
      checks.push({
        endpoint: '/api/settings/system-settings',
        status: simpleResponse.status,
        responseTime: simpleResponse.responseTime,
        success: simpleResponse.status === 200
      });
      if (simpleResponse.status === 200) {
        hasSuccessfulResponse = true;
        lastSuccessfulResponse = Date.now();
      }
    } catch (error) {
      checks.push({
        endpoint: '/api/settings/system-settings',
        status: 'TIMEOUT/ERROR',
        error: error.message,
        success: false
      });
    }
    
    // Check for SSE connections (these can cause freezing)
    try {
      const sseResponse = await makeRequest(`${config.baseUrl}/api/realtime/sse`);
      checks.push({
        endpoint: '/api/realtime/sse',
        status: sseResponse.status,
        responseTime: sseResponse.responseTime,
        success: sseResponse.status === 200
      });
    } catch (error) {
      checks.push({
        endpoint: '/api/realtime/sse',
        status: 'TIMEOUT/ERROR',
        error: error.message,
        success: false
      });
    }
    
    // Log results
    const successfulChecks = checks.filter(c => c.success).length;
    const totalChecks = checks.length;
    
    console.log(`[${new Date().toISOString()}] Frozen state check: ${successfulChecks}/${totalChecks} successful`);
    
    checks.forEach(check => {
      if (check.success) {
        console.log(`  ✅ ${check.endpoint}: ${check.status} (${check.responseTime}ms)`);
      } else {
        console.log(`  ❌ ${check.endpoint}: ${check.status} - ${check.error || 'Unknown error'}`);
      }
    });
    
    // Detect frozen state
    if (!hasSuccessfulResponse) {
      frozenDetectionCount++;
      const timeSinceLastSuccess = Date.now() - lastSuccessfulResponse;
      
      if (frozenDetectionCount >= 3) {
        console.log(`🚨 FROZEN STATE DETECTED! Application has been unresponsive for ${Math.round(timeSinceLastSuccess / 1000)}s`);
        console.log(`🚨 Frozen detection count: ${frozenDetectionCount}`);
        return {
          timestamp: new Date().toISOString(),
          frozen: true,
          timeSinceLastSuccess,
          frozenDetectionCount,
          checks
        };
      } else {
        console.log(`⚠️ Potential frozen state detected (${frozenDetectionCount}/3): ${Math.round(timeSinceLastSuccess / 1000)}s since last response`);
      }
    } else {
      // Reset frozen detection if we got a successful response
      if (frozenDetectionCount > 0) {
        console.log(`✅ Application recovered from potential frozen state`);
        frozenDetectionCount = 0;
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      frozen: false,
      successfulChecks,
      totalChecks,
      checks
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during frozen state check:`, error.message);
    frozenDetectionCount++;
    return {
      timestamp: new Date().toISOString(),
      frozen: true,
      error: error.message,
      frozenDetectionCount
    };
  }
}

// Attempt to unfreeze the application
async function attemptUnfreeze() {
  console.log(`[${new Date().toISOString()}] 🚨 Attempting to unfreeze application...`);
  
  try {
    // Try to restart the application by calling a restart endpoint
    console.log(`[${new Date().toISOString()}] Attempting application restart...`);
    
    // Try to clear any stuck processes
    try {
      await makeRequest(`${config.baseUrl}/api/health/restart`, { method: 'POST' });
      console.log(`[${new Date().toISOString()}] Restart endpoint called successfully`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] Restart endpoint not available: ${error.message}`);
    }
    
    // Wait a bit and check if it recovered
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const recoveryCheck = await checkFrozenState();
    if (!recoveryCheck.frozen) {
      console.log(`[${new Date().toISOString()}] ✅ Application successfully unfrozen!`);
      return true;
    } else {
      console.log(`[${new Date().toISOString()}] ❌ Application still frozen after restart attempt`);
      return false;
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during unfreeze attempt:`, error.message);
    return false;
  }
}

// Main monitoring loop
async function monitorLoop() {
  console.log(`[${new Date().toISOString()}] Starting frozen application monitoring...`);
  console.log(`[${new Date().toISOString()}] Will check every ${config.checkIntervalMs}ms for ${config.maxChecks} checks`);
  console.log(`[${new Date().toISOString()}] Base URL: ${config.baseUrl}`);
  console.log(`[${new Date().toISOString()}] Timeout: ${config.timeoutMs}ms`);
  console.log('');
  
  const results = [];
  let unfreezeAttempted = false;
  
  while (checkCount < config.maxChecks) {
    checkCount++;
    startTime = Date.now();
    
    const result = await checkFrozenState();
    results.push(result);
    
    // If frozen state detected and we haven't tried to unfreeze yet
    if (result.frozen && !unfreezeAttempted) {
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
    console.log(`  🚨 Frozen state detected ${frozenResults.length} times`);
    console.log(`  Average time frozen: ${Math.round(frozenResults.reduce((sum, r) => sum + (r.timeSinceLastSuccess || 0), 0) / frozenResults.length / 1000)}s`);
  }
  
  // Recommendations
  console.log('');
  console.log(`[${new Date().toISOString()}] Recommendations:`);
  console.log(`  1. Check for infinite loops in React components`);
  console.log(`  2. Check for stuck database connections`);
  console.log(`  3. Check for EventSource/SSE connection issues`);
  console.log(`  4. Check for memory leaks in browser`);
  console.log(`  5. Restart the application manually if needed`);
}

// Handle graceful shutdown
function shutdown(signal) {
  console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down gracefully`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start monitoring
monitorLoop().catch((error) => {
  console.error(`[${new Date().toISOString()}] Fatal error in monitoring:`, error.message);
  process.exit(1);
});
