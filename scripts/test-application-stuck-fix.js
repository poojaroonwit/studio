#!/usr/bin/env node

/**
 * Test Script: Application Stuck Fix Verification
 * 
 * This script monitors the application for an extended period to verify
 * that the stuck state issue has been resolved.
 * 
 * Usage: node scripts/test-application-stuck-fix.js
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  testDuration: 10 * 60 * 1000, // 10 minutes
  checkInterval: 30 * 1000, // 30 seconds
  endpoints: [
    '/api/health',
    '/api/settings/system-settings',
    '/api/auth/session'
  ]
};

// Test state
let testStartTime = Date.now();
let checkCount = 0;
let successCount = 0;
let errorCount = 0;
let lastResponseTime = 0;
let maxResponseTime = 0;
let minResponseTime = Infinity;

// HTTP request utility
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const startTime = Date.now();
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000, // 10 second timeout
    };
    
    const req = client.request(requestOptions, (res) => {
      const responseTime = Date.now() - startTime;
      lastResponseTime = responseTime;
      maxResponseTime = Math.max(maxResponseTime, responseTime);
      minResponseTime = Math.min(minResponseTime, responseTime);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, responseTime, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
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
    
    req.end();
  });
}

// Test endpoint health
async function testEndpoint(endpoint) {
  try {
    const result = await makeRequest(`${config.baseUrl}${endpoint}`);
    return { endpoint, success: true, ...result };
  } catch (error) {
    return { endpoint, success: false, error: error.message };
  }
}

// Run health check
async function runHealthCheck() {
  checkCount++;
  const checkStartTime = Date.now();
  
  console.log(`\n🔍 Health Check #${checkCount} - ${new Date().toISOString()}`);
  
  const results = await Promise.allSettled(
    config.endpoints.map(endpoint => testEndpoint(endpoint))
  );
  
  let checkSuccess = true;
  const successfulEndpoints = [];
  const failedEndpoints = [];
  
  results.forEach((result, index) => {
    const endpoint = config.endpoints[index];
    
    if (result.status === 'fulfilled' && result.value.success) {
      successfulEndpoints.push({
        endpoint,
        status: result.value.status,
        responseTime: result.value.responseTime
      });
    } else {
      failedEndpoints.push({
        endpoint,
        error: result.status === 'rejected' ? result.reason.message : result.value.error
      });
      checkSuccess = false;
    }
  });
  
  // Log results
  if (successfulEndpoints.length > 0) {
    console.log('✅ Successful endpoints:');
    successfulEndpoints.forEach(({ endpoint, status, responseTime }) => {
      console.log(`   ${endpoint} - ${status} (${responseTime}ms)`);
    });
  }
  
  if (failedEndpoints.length > 0) {
    console.log('❌ Failed endpoints:');
    failedEndpoints.forEach(({ endpoint, error }) => {
      console.log(`   ${endpoint} - ${error}`);
    });
  }
  
  // Update counters
  if (checkSuccess) {
    successCount++;
    console.log(`✅ Check #${checkCount} PASSED`);
  } else {
    errorCount++;
    console.log(`❌ Check #${checkCount} FAILED`);
  }
  
  const checkDuration = Date.now() - checkStartTime;
  console.log(`⏱️  Check duration: ${checkDuration}ms`);
  
  return checkSuccess;
}

// Main test loop
async function runTest() {
  console.log('🚀 Starting Application Stuck Fix Test');
  console.log(`📊 Test Configuration:`);
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Test Duration: ${config.testDuration / 1000 / 60} minutes`);
  console.log(`   Check Interval: ${config.checkInterval / 1000} seconds`);
  console.log(`   Endpoints: ${config.endpoints.join(', ')}`);
  
  const interval = setInterval(async () => {
    const elapsed = Date.now() - testStartTime;
    
    if (elapsed >= config.testDuration) {
      clearInterval(interval);
      await finishTest();
      return;
    }
    
    await runHealthCheck();
  }, config.checkInterval);
  
  // Initial check
  await runHealthCheck();
}

// Finish test and report results
async function finishTest() {
  const totalDuration = Date.now() - testStartTime;
  const successRate = (successCount / checkCount) * 100;
  
  console.log('\n📊 TEST RESULTS');
  console.log('===============');
  console.log(`Total Duration: ${Math.round(totalDuration / 1000)} seconds`);
  console.log(`Total Checks: ${checkCount}`);
  console.log(`Successful Checks: ${successCount}`);
  console.log(`Failed Checks: ${errorCount}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Average Response Time: ${Math.round((minResponseTime + maxResponseTime) / 2)}ms`);
  console.log(`Min Response Time: ${minResponseTime}ms`);
  console.log(`Max Response Time: ${maxResponseTime}ms`);
  
  // Determine if test passed
  if (successRate >= 95) {
    console.log('\n✅ TEST PASSED: Application is stable and responsive');
    console.log('   The stuck state fix appears to be working correctly.');
  } else if (successRate >= 80) {
    console.log('\n⚠️  TEST PARTIAL: Application has some issues but is mostly stable');
    console.log('   Some endpoints may need additional optimization.');
  } else {
    console.log('\n❌ TEST FAILED: Application is still experiencing issues');
    console.log('   The stuck state fix may need further investigation.');
  }
  
  // Additional recommendations
  if (errorCount > 0) {
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('   - Check server logs for error details');
    console.log('   - Monitor database connection pool');
    console.log('   - Verify upload queue processor is running correctly');
    console.log('   - Check for memory leaks or excessive CPU usage');
  }
  
  process.exit(successRate >= 95 ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  finishTest();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  finishTest();
});

// Start the test
runTest().catch((error) => {
  console.error('❌ Test failed to start:', error.message);
  process.exit(1);
});
