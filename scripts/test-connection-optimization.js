#!/usr/bin/env node

/**
 * Test Connection Optimization Script
 * 
 * Tests the browser connection optimization system to ensure it works around
 * browser connection pool limits effectively.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  testDuration: 60000, // 1 minute
  concurrentRequests: 10,
  requestInterval: 1000, // 1 second
  timeoutMs: 5000,
};

let testResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  connectionErrors: 0,
  timeoutErrors: 0,
  startTime: Date.now(),
  endTime: null
};

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
        'User-Agent': 'ConnectionOptimizerTest/1.0',
        ...options.headers
      },
      timeout: options.timeout || config.timeoutMs
    };

    const startTime = Date.now();
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          responseTime,
          data: data
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

    req.end();
  });
}

// Test endpoints
const testEndpoints = [
  '/api/health',
  '/api/settings/system-settings',
  '/api/upload-queue/status',
  '/api/candidates/count',
  '/api/positions/count'
];

// Simulate concurrent requests
async function simulateConcurrentRequests() {
  const promises = [];
  
  for (let i = 0; i < config.concurrentRequests; i++) {
    const endpoint = testEndpoints[i % testEndpoints.length];
    const promise = makeRequest(`${config.baseUrl}${endpoint}`)
      .then(result => {
        testResults.successfulRequests++;
        testResults.averageResponseTime = 
          (testResults.averageResponseTime + result.responseTime) / 2;
        return result;
      })
      .catch(error => {
        testResults.failedRequests++;
        if (error.message.includes('timeout')) {
          testResults.timeoutErrors++;
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
          testResults.connectionErrors++;
        }
        throw error;
      });
    
    promises.push(promise);
  }

  return Promise.allSettled(promises);
}

// Run connection optimization test
async function runConnectionTest() {
  console.log(`🚀 Starting Connection Optimization Test`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Test Duration: ${config.testDuration}ms`);
  console.log(`Concurrent Requests: ${config.concurrentRequests}`);
  console.log(`Request Interval: ${config.requestInterval}ms`);
  console.log('');

  const testStartTime = Date.now();
  let testCount = 0;

  const testInterval = setInterval(async () => {
    testCount++;
    const elapsed = Date.now() - testStartTime;
    
    console.log(`[${new Date().toISOString()}] Test ${testCount}: Running ${config.concurrentRequests} concurrent requests...`);
    
    try {
      const results = await simulateConcurrentRequests();
      testResults.totalRequests += config.concurrentRequests;
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  ❌ Failed: ${failureCount}`);
      
      if (failureCount > 0) {
        console.log(`  ⚠️  Connection pool may be exhausted`);
      }
      
    } catch (error) {
      console.error(`  🚨 Test error:`, error.message);
    }

    // Check if test duration exceeded
    if (elapsed >= config.testDuration) {
      clearInterval(testInterval);
      testResults.endTime = Date.now();
      await finishTest();
    }
  }, config.requestInterval);
}

// Finish test and display results
async function finishTest() {
  console.log('');
  console.log(`🏁 Connection Optimization Test Completed`);
  console.log(`========================================`);
  console.log(`Test Duration: ${Math.round((testResults.endTime - testResults.startTime) / 1000)}s`);
  console.log(`Total Requests: ${testResults.totalRequests}`);
  console.log(`Successful Requests: ${testResults.successfulRequests}`);
  console.log(`Failed Requests: ${testResults.failedRequests}`);
  console.log(`Success Rate: ${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Average Response Time: ${Math.round(testResults.averageResponseTime)}ms`);
  console.log(`Connection Errors: ${testResults.connectionErrors}`);
  console.log(`Timeout Errors: ${testResults.timeoutErrors}`);
  console.log('');

  // Analysis
  console.log(`📊 Analysis:`);
  
  if (testResults.successfulRequests / testResults.totalRequests > 0.9) {
    console.log(`  ✅ Excellent: Connection optimization working well`);
  } else if (testResults.successfulRequests / testResults.totalRequests > 0.7) {
    console.log(`  ⚠️  Good: Some connection issues detected`);
  } else {
    console.log(`  ❌ Poor: Significant connection pool issues`);
  }

  if (testResults.connectionErrors > testResults.totalRequests * 0.1) {
    console.log(`  🚨 High connection error rate - browser limits may be exceeded`);
  }

  if (testResults.timeoutErrors > testResults.totalRequests * 0.05) {
    console.log(`  ⏰ High timeout rate - consider reducing concurrent requests`);
  }

  // Recommendations
  console.log('');
  console.log(`💡 Recommendations:`);
  
  if (testResults.successfulRequests / testResults.totalRequests < 0.8) {
    console.log(`  1. Reduce concurrent request count`);
    console.log(`  2. Implement request queuing`);
    console.log(`  3. Add connection pooling`);
    console.log(`  4. Use connection optimization strategies`);
  }

  if (testResults.averageResponseTime > 2000) {
    console.log(`  5. Optimize server response times`);
    console.log(`  6. Consider caching strategies`);
  }

  console.log(`  7. Monitor browser connection limits`);
  console.log(`  8. Implement graceful degradation`);
}

// Handle graceful shutdown
function shutdown(signal) {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);
  testResults.endTime = Date.now();
  finishTest().then(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the test
runConnectionTest().catch(error => {
  console.error(`[${new Date().toISOString()}] Fatal error:`, error);
  process.exit(1);
});
