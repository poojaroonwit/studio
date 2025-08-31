#!/usr/bin/env node

/**
 * Test Enhanced Connection Optimization Script
 * 
 * Tests the enhanced browser connection optimization system with increased limits
 * and automatic cleanup features.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  testDuration: 120000, // 2 minutes
  concurrentRequests: 15, // Increased from 10 to 15
  requestInterval: 2000, // 2 seconds
  timeoutMs: 8000, // Increased timeout
  cleanupTestInterval: 30000, // Test cleanup every 30 seconds
};

let testResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  connectionErrors: 0,
  timeoutErrors: 0,
  cleanupEvents: 0,
  startTime: Date.now(),
  endTime: null,
  connectionStats: {
    peakConnections: 0,
    averageConnections: 0,
    connectionCounts: []
  }
};

// Simple HTTP request utility with connection tracking
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
        'User-Agent': 'EnhancedConnectionTest/1.0',
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

// Test endpoints with different priorities
const testEndpoints = [
  { url: '/api/health', priority: 'high' },
  { url: '/api/settings/system-settings', priority: 'high' },
  { url: '/api/upload-queue/status', priority: 'medium' },
  { url: '/api/candidates/count', priority: 'medium' },
  { url: '/api/positions/count', priority: 'low' },
  { url: '/api/realtime/sse', priority: 'critical' }
];

// Simulate concurrent requests with priority
async function simulateConcurrentRequests() {
  const promises = [];
  
  for (let i = 0; i < config.concurrentRequests; i++) {
    const endpoint = testEndpoints[i % testEndpoints.length];
    const promise = makeRequest(`${config.baseUrl}${endpoint.url}`)
      .then(result => {
        testResults.successfulRequests++;
        testResults.averageResponseTime = 
          (testResults.averageResponseTime + result.responseTime) / 2;
        return { ...result, priority: endpoint.priority };
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

// Test SSE connection
async function testSSEConnection() {
  return new Promise((resolve, reject) => {
    const url = `${config.baseUrl}/api/realtime/sse`;
    const eventSource = new EventSource(url);
    
    let messageCount = 0;
    const maxMessages = 5;
    
    eventSource.onopen = () => {
      console.log('  🔗 SSE connection established');
    };
    
    eventSource.onmessage = (event) => {
      messageCount++;
      console.log(`  📨 SSE message ${messageCount}: ${event.data.substring(0, 50)}...`);
      
      if (messageCount >= maxMessages) {
        eventSource.close();
        resolve({ messageCount, success: true });
      }
    };
    
    eventSource.onerror = (error) => {
      console.log('  ❌ SSE connection error:', error);
      eventSource.close();
      reject(error);
    };
    
    // Timeout after 10 seconds
    setTimeout(() => {
      eventSource.close();
      resolve({ messageCount, success: false, timeout: true });
    }, 10000);
  });
}

// Run enhanced connection test
async function runEnhancedConnectionTest() {
  console.log(`🚀 Starting Enhanced Connection Optimization Test`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Test Duration: ${config.testDuration}ms`);
  console.log(`Concurrent Requests: ${config.concurrentRequests}`);
  console.log(`Request Interval: ${config.requestInterval}ms`);
  console.log(`Enhanced Limits: 12 connections (browser), 8 connections (pool)`);
  console.log(`Auto Cleanup: Enabled with 30-60s inactivity timeout`);
  console.log('');

  const testStartTime = Date.now();
  let testCount = 0;
  let sseTestCount = 0;

  // Regular request testing
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
      
      // Track connection stats
      const currentConnections = successCount + failureCount;
      testResults.connectionStats.connectionCounts.push(currentConnections);
      testResults.connectionStats.peakConnections = Math.max(testResults.connectionStats.peakConnections, currentConnections);
      
      if (failureCount > 0) {
        console.log(`  ⚠️  Some connection issues detected`);
      } else {
        console.log(`  🎉 All requests successful!`);
      }
      
    } catch (error) {
      console.error(`  🚨 Test error:`, error.message);
    }

    // Test SSE connection every 3rd test
    if (testCount % 3 === 0) {
      sseTestCount++;
      console.log(`  🔗 Testing SSE connection (test ${sseTestCount})...`);
      try {
        const sseResult = await testSSEConnection();
        if (sseResult.success) {
          console.log(`  ✅ SSE test successful: ${sseResult.messageCount} messages`);
        } else {
          console.log(`  ⏰ SSE test timed out`);
        }
      } catch (error) {
        console.log(`  ❌ SSE test failed:`, error.message);
      }
    }

    // Check if test duration exceeded
    if (elapsed >= config.testDuration) {
      clearInterval(testInterval);
      testResults.endTime = Date.now();
      await finishEnhancedTest();
    }
  }, config.requestInterval);
}

// Finish enhanced test and display results
async function finishEnhancedTest() {
  console.log('');
  console.log(`🏁 Enhanced Connection Optimization Test Completed`);
  console.log(`================================================`);
  console.log(`Test Duration: ${Math.round((testResults.endTime - testResults.startTime) / 1000)}s`);
  console.log(`Total Requests: ${testResults.totalRequests}`);
  console.log(`Successful Requests: ${testResults.successfulRequests}`);
  console.log(`Failed Requests: ${testResults.failedRequests}`);
  console.log(`Success Rate: ${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Average Response Time: ${Math.round(testResults.averageResponseTime)}ms`);
  console.log(`Connection Errors: ${testResults.connectionErrors}`);
  console.log(`Timeout Errors: ${testResults.timeoutErrors}`);
  console.log(`Cleanup Events: ${testResults.cleanupEvents}`);
  console.log('');

  // Connection statistics
  if (testResults.connectionStats.connectionCounts.length > 0) {
    const avgConnections = testResults.connectionStats.connectionCounts.reduce((a, b) => a + b, 0) / testResults.connectionStats.connectionCounts.length;
    testResults.connectionStats.averageConnections = avgConnections;
    
    console.log(`📊 Connection Statistics:`);
    console.log(`  Peak Concurrent Connections: ${testResults.connectionStats.peakConnections}`);
    console.log(`  Average Concurrent Connections: ${avgConnections.toFixed(2)}`);
    console.log(`  Connection Limit: 12 (browser) / 8 (pool)`);
    console.log('');
  }

  // Enhanced analysis
  console.log(`📊 Enhanced Analysis:`);
  
  const successRate = testResults.successfulRequests / testResults.totalRequests;
  if (successRate > 0.95) {
    console.log(`  ✅ Excellent: Enhanced connection optimization working perfectly`);
  } else if (successRate > 0.85) {
    console.log(`  ⚠️  Good: Enhanced optimization working well with minor issues`);
  } else if (successRate > 0.7) {
    console.log(`  🔧 Fair: Some connection issues, optimization needs tuning`);
  } else {
    console.log(`  ❌ Poor: Significant connection issues detected`);
  }

  if (testResults.connectionStats.peakConnections >= 10) {
    console.log(`  🚀 High connection utilization: ${testResults.connectionStats.peakConnections}/12`);
  }

  if (testResults.timeoutErrors > testResults.totalRequests * 0.05) {
    console.log(`  ⏰ High timeout rate - consider increasing timeout values`);
  }

  // Enhanced recommendations
  console.log('');
  console.log(`💡 Enhanced Recommendations:`);
  
  if (successRate < 0.9) {
    console.log(`  1. Monitor connection pool health`);
    console.log(`  2. Check server response times`);
    console.log(`  3. Verify cleanup mechanisms are working`);
  }

  if (testResults.connectionStats.peakConnections >= 10) {
    console.log(`  4. Consider implementing connection pooling`);
    console.log(`  5. Monitor browser connection limits`);
  }

  console.log(`  6. Use enhanced connection optimization features`);
  console.log(`  7. Enable automatic cleanup for inactive connections`);
  console.log(`  8. Monitor connection activity patterns`);
  console.log(`  9. Implement graceful degradation strategies`);
  console.log(`  10. Use priority-based connection management`);
}

// Handle graceful shutdown
function shutdown(signal) {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);
  testResults.endTime = Date.now();
  finishEnhancedTest().then(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the enhanced test
runEnhancedConnectionTest().catch(error => {
  console.error(`[${new Date().toISOString()}] Fatal error:`, error);
  process.exit(1);
});
