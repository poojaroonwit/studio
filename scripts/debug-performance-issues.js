#!/usr/bin/env node

/**
 * Performance Debug Script
 * 
 * This script helps diagnose performance issues that might be causing the application
 * to get stuck after about 1 minute of use.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  checkIntervalMs: 10000, // Check every 10 seconds
  maxChecks: 60, // Run for 10 minutes
  timeoutMs: 5000,
};

let checkCount = 0;
let startTime = Date.now();

// Simple HTTP request utility
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
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Check application health
async function checkApplicationHealth() {
  const checks = [];
  
  try {
    // Check main application
    console.log(`[${new Date().toISOString()}] Checking application health...`);
    
    // Check if application is responding
    try {
      const healthResponse = await makeRequest(`${config.baseUrl}/api/health`);
      checks.push({
        endpoint: '/api/health',
        status: healthResponse.status,
        responseTime: healthResponse.responseTime,
        success: healthResponse.status === 200
      });
    } catch (error) {
      checks.push({
        endpoint: '/api/health',
        status: 'ERROR',
        error: error.message,
        success: false
      });
    }
    
    // Check upload queue status
    try {
      const queueResponse = await makeRequest(`${config.baseUrl}/api/upload-queue?limit=10`);
      checks.push({
        endpoint: '/api/upload-queue',
        status: queueResponse.status,
        responseTime: queueResponse.responseTime,
        success: queueResponse.status === 200
      });
    } catch (error) {
      checks.push({
        endpoint: '/api/upload-queue',
        status: 'ERROR',
        error: error.message,
        success: false
      });
    }
    
    // Check system settings
    try {
      const settingsResponse = await makeRequest(`${config.baseUrl}/api/settings/system-settings`);
      checks.push({
        endpoint: '/api/settings/system-settings',
        status: settingsResponse.status,
        responseTime: settingsResponse.responseTime,
        success: settingsResponse.status === 200
      });
    } catch (error) {
      checks.push({
        endpoint: '/api/settings/system-settings',
        status: 'ERROR',
        error: error.message,
        success: false
      });
    }
    
    // Log results
    const successfulChecks = checks.filter(c => c.success).length;
    const totalChecks = checks.length;
    
    console.log(`[${new Date().toISOString()}] Health check results: ${successfulChecks}/${totalChecks} successful`);
    
    checks.forEach(check => {
      if (check.success) {
        console.log(`  ✅ ${check.endpoint}: ${check.status} (${check.responseTime}ms)`);
      } else {
        console.log(`  ❌ ${check.endpoint}: ${check.status} - ${check.error || 'Unknown error'}`);
      }
    });
    
    return {
      timestamp: new Date().toISOString(),
      successfulChecks,
      totalChecks,
      checks
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during health check:`, error.message);
    return {
      timestamp: new Date().toISOString(),
      successfulChecks: 0,
      totalChecks: 0,
      error: error.message
    };
  }
}

// Main monitoring loop
async function monitorLoop() {
  console.log(`[${new Date().toISOString()}] Starting performance monitoring...`);
  console.log(`[${new Date().toISOString()}] Will check every ${config.checkIntervalMs}ms for ${config.maxChecks} checks`);
  console.log(`[${new Date().toISOString()}] Base URL: ${config.baseUrl}`);
  console.log('');
  
  const results = [];
  
  while (checkCount < config.maxChecks) {
    checkCount++;
    startTime = Date.now();
    
    const result = await checkApplicationHealth();
    results.push(result);
    
    // Check if we should stop early due to issues
    if (result.successfulChecks === 0) {
      console.log(`[${new Date().toISOString()}] 🚨 All health checks failed! Application may be stuck.`);
      console.log(`[${new Date().toISOString()}] Stopping monitoring early due to critical failure.`);
      break;
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
  console.log(`  Successful checks: ${results.filter(r => r.successfulChecks > 0).length}`);
  console.log(`  Failed checks: ${results.filter(r => r.successfulChecks === 0).length}`);
  
  const avgResponseTime = results
    .filter(r => r.checks && r.checks.length > 0)
    .flatMap(r => r.checks)
    .filter(c => c.responseTime)
    .reduce((sum, c) => sum + c.responseTime, 0) / 
    results.flatMap(r => r.checks || []).filter(c => c.responseTime).length;
  
  if (avgResponseTime) {
    console.log(`  Average response time: ${Math.round(avgResponseTime)}ms`);
  }
  
  // Check for patterns
  const consecutiveFailures = results.reduce((max, result) => {
    if (result.successfulChecks === 0) {
      return max + 1;
    } else {
      return Math.max(max, 0);
    }
  }, 0);
  
  if (consecutiveFailures > 3) {
    console.log(`  🚨 Detected ${consecutiveFailures} consecutive failures - application may be stuck`);
  }
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
