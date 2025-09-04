#!/usr/bin/env node

/**
 * SSE Chunked Encoding Fix Test Script v2
 * 
 * This script tests the SSE connection to identify and diagnose chunked encoding issues.
 * It provides detailed analysis and recommendations for fixing SSE connection problems.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const DEFAULT_URL = 'http://localhost:8021/api/sse';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  url: DEFAULT_URL,
  timeout: DEFAULT_TIMEOUT,
  retries: DEFAULT_RETRIES,
  verbose: false,
  help: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--url':
      config.url = args[++i];
      break;
    case '--timeout':
      config.timeout = parseInt(args[++i]) || DEFAULT_TIMEOUT;
      break;
    case '--retries':
      config.retries = parseInt(args[++i]) || DEFAULT_RETRIES;
      break;
    case '--verbose':
    case '-v':
      config.verbose = true;
      break;
    case '--help':
    case '-h':
      config.help = true;
      break;
  }
}

if (config.help) {
  console.log(`
SSE Chunked Encoding Fix Test Script v2

Usage: node test-sse-chunked-encoding-fix-v2.js [options]

Options:
  --url <url>        SSE endpoint URL (default: ${DEFAULT_URL})
  --timeout <ms>     Connection timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
  --retries <count>  Number of retry attempts (default: ${DEFAULT_RETRIES})
  --verbose, -v      Enable verbose logging
  --help, -h         Show this help message

Examples:
  node test-sse-chunked-encoding-fix-v2.js
  node test-sse-chunked-encoding-fix-v2.js --url https://localhost:3000/api/sse --verbose
  node test-sse-chunked-encoding-fix-v2.js --timeout 60000 --retries 5
`);
  process.exit(0);
}

// Test results tracking
const testResults = {
  startTime: Date.now(),
  tests: [],
  errors: [],
  warnings: [],
  recommendations: []
};

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else if (config.verbose || level === 'info') {
    console.log(`${prefix} ${message}`);
  }
}

function addTest(name, status, details = {}) {
  testResults.tests.push({
    name,
    status,
    details,
    timestamp: Date.now()
  });
  log(`Test: ${name} - ${status}`, status === 'PASS' ? 'info' : 'warn');
}

function addError(message, details = {}) {
  testResults.errors.push({
    message,
    details,
    timestamp: Date.now()
  });
  log(`Error: ${message}`, 'error');
}

function addWarning(message, details = {}) {
  testResults.warnings.push({
    message,
    details,
    timestamp: Date.now()
  });
  log(`Warning: ${message}`, 'warn');
}

function addRecommendation(message, priority = 'medium') {
  testResults.recommendations.push({
    message,
    priority,
    timestamp: Date.now()
  });
  log(`Recommendation: ${message}`, 'info');
}

// Test functions
async function testBasicConnectivity() {
  log('Testing basic connectivity...');
  
  try {
    const url = new URL(config.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    return new Promise((resolve) => {
      const req = client.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        timeout: config.timeout
      }, (res) => {
        log(`Response status: ${res.statusCode}`, 'info');
        log(`Response headers: ${JSON.stringify(res.headers, null, 2)}`, 'info');
        
        if (res.statusCode === 200) {
          addTest('Basic Connectivity', 'PASS', {
            statusCode: res.statusCode,
            headers: res.headers
          });
        } else {
          addTest('Basic Connectivity', 'FAIL', {
            statusCode: res.statusCode,
            headers: res.headers
          });
          addError(`Unexpected status code: ${res.statusCode}`);
        }
        
        // Check for chunked encoding
        const transferEncoding = res.headers['transfer-encoding'];
        const contentEncoding = res.headers['content-encoding'];
        
        if (transferEncoding === 'chunked') {
          addWarning('Response uses chunked encoding', {
            transferEncoding,
            contentEncoding
          });
          addRecommendation('Consider disabling chunked encoding for SSE streams', 'high');
        } else if (transferEncoding === 'identity' || !transferEncoding) {
          addTest('Chunked Encoding Check', 'PASS', {
            transferEncoding,
            contentEncoding
          });
        }
        
        // Check content type
        const contentType = res.headers['content-type'];
        if (contentType && contentType.includes('text/event-stream')) {
          addTest('Content Type Check', 'PASS', { contentType });
        } else {
          addTest('Content Type Check', 'FAIL', { contentType });
          addError(`Invalid content type: ${contentType}`);
        }
        
        // Check CORS headers
        const corsOrigin = res.headers['access-control-allow-origin'];
        if (corsOrigin) {
          addTest('CORS Headers', 'PASS', { corsOrigin });
        } else {
          addWarning('Missing CORS headers', { corsOrigin });
          addRecommendation('Add CORS headers for SSE endpoints', 'medium');
        }
        
        res.destroy();
        resolve();
      });
      
      req.on('error', (error) => {
        addTest('Basic Connectivity', 'FAIL', { error: error.message });
        addError(`Connection failed: ${error.message}`);
        resolve();
      });
      
      req.on('timeout', () => {
        addTest('Basic Connectivity', 'FAIL', { error: 'Timeout' });
        addError('Connection timeout');
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  } catch (error) {
    addTest('Basic Connectivity', 'FAIL', { error: error.message });
    addError(`URL parsing failed: ${error.message}`);
  }
}

async function testSSEConnection() {
  log('Testing SSE connection...');
  
  try {
    const url = new URL(config.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    let eventCount = 0;
    let keepaliveCount = 0;
    let lastEventTime = Date.now();
    let connectionStartTime = Date.now();
    
    return new Promise((resolve) => {
      const req = client.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        timeout: config.timeout
      }, (res) => {
        log('SSE connection established', 'info');
        
        let buffer = '';
        let chunkedErrorDetected = false;
        
        res.on('data', (chunk) => {
          lastEventTime = Date.now();
          buffer += chunk.toString();
          
          // Process complete events
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Keep incomplete event in buffer
          
          for (const event of events) {
            if (event.trim()) {
              eventCount++;
              
              // Parse SSE event
              const lines = event.split('\n');
              let eventType = 'message';
              let data = '';
              
              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.substring(7);
                } else if (line.startsWith('data: ')) {
                  data = line.substring(6);
                }
              }
              
              if (eventType === 'keepalive') {
                keepaliveCount++;
                log(`Keepalive received (${keepaliveCount})`, 'info');
              } else {
                log(`Event received: ${eventType}`, 'info');
              }
              
              // Check for chunked encoding errors in data
              if (data.includes('chunked') || data.includes('encoding')) {
                chunkedErrorDetected = true;
                addWarning('Chunked encoding error detected in event data', { data });
              }
            }
          }
        });
        
        res.on('end', () => {
          const connectionDuration = Date.now() - connectionStartTime;
          log(`SSE connection ended after ${connectionDuration}ms`, 'info');
          
          if (eventCount > 0) {
            addTest('SSE Event Reception', 'PASS', {
              eventCount,
              keepaliveCount,
              connectionDuration
            });
          } else {
            addTest('SSE Event Reception', 'FAIL', {
              eventCount,
              keepaliveCount,
              connectionDuration
            });
            addError('No SSE events received');
          }
          
          if (keepaliveCount > 0) {
            addTest('Keepalive Events', 'PASS', { keepaliveCount });
          } else {
            addTest('Keepalive Events', 'FAIL', { keepaliveCount });
            addWarning('No keepalive events received');
            addRecommendation('Check keepalive interval configuration', 'medium');
          }
          
          if (chunkedErrorDetected) {
            addTest('Chunked Encoding Error Detection', 'FAIL', { chunkedErrorDetected });
            addError('Chunked encoding errors detected in event data');
          } else {
            addTest('Chunked Encoding Error Detection', 'PASS', { chunkedErrorDetected });
          }
          
          resolve();
        });
        
        res.on('error', (error) => {
          addTest('SSE Connection', 'FAIL', { error: error.message });
          addError(`SSE connection error: ${error.message}`);
          resolve();
        });
      });
      
      req.on('error', (error) => {
        addTest('SSE Connection', 'FAIL', { error: error.message });
        addError(`SSE connection failed: ${error.message}`);
        resolve();
      });
      
      req.on('timeout', () => {
        addTest('SSE Connection', 'FAIL', { error: 'Timeout' });
        addError('SSE connection timeout');
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  } catch (error) {
    addTest('SSE Connection', 'FAIL', { error: error.message });
    addError(`SSE connection test failed: ${error.message}`);
  }
}

async function testRetryLogic() {
  log('Testing retry logic...');
  
  let retryCount = 0;
  const maxRetries = config.retries;
  
  while (retryCount < maxRetries) {
    retryCount++;
    log(`Retry attempt ${retryCount}/${maxRetries}`, 'info');
    
    try {
      await testBasicConnectivity();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
    } catch (error) {
      addError(`Retry ${retryCount} failed: ${error.message}`);
    }
  }
  
  addTest('Retry Logic', 'PASS', { retryCount });
}

// Main test execution
async function runTests() {
  log('Starting SSE Chunked Encoding Fix Tests v2', 'info');
  log(`Configuration: ${JSON.stringify(config, null, 2)}`, 'info');
  
  try {
    await testBasicConnectivity();
    await testSSEConnection();
    await testRetryLogic();
  } catch (error) {
    addError(`Test execution failed: ${error.message}`);
  }
  
  // Generate final report
  const endTime = Date.now();
  const duration = endTime - testResults.startTime;
  
  log('\n' + '='.repeat(60), 'info');
  log('SSE CHUNKED ENCODING FIX TEST REPORT v2', 'info');
  log('='.repeat(60), 'info');
  
  log(`\nTest Duration: ${duration}ms`, 'info');
  log(`Tests Run: ${testResults.tests.length}`, 'info');
  log(`Errors: ${testResults.errors.length}`, 'error');
  log(`Warnings: ${testResults.warnings.length}`, 'warn');
  log(`Recommendations: ${testResults.recommendations.length}`, 'info');
  
  // Test results summary
  log('\nTest Results:', 'info');
  testResults.tests.forEach(test => {
    const status = test.status === 'PASS' ? '✅' : '❌';
    log(`  ${status} ${test.name}`, test.status === 'PASS' ? 'info' : 'warn');
  });
  
  // Errors
  if (testResults.errors.length > 0) {
    log('\nErrors:', 'error');
    testResults.errors.forEach(error => {
      log(`  ❌ ${error.message}`, 'error');
    });
  }
  
  // Warnings
  if (testResults.warnings.length > 0) {
    log('\nWarnings:', 'warn');
    testResults.warnings.forEach(warning => {
      log(`  ⚠️  ${warning.message}`, 'warn');
    });
  }
  
  // Recommendations
  if (testResults.recommendations.length > 0) {
    log('\nRecommendations:', 'info');
    testResults.recommendations.forEach(rec => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      log(`  ${priority} ${rec.message}`, 'info');
    });
  }
  
  // Overall status
  const hasErrors = testResults.errors.length > 0;
  const hasWarnings = testResults.warnings.length > 0;
  
  log('\n' + '='.repeat(60), 'info');
  if (hasErrors) {
    log('❌ TESTS FAILED - Errors detected', 'error');
  } else if (hasWarnings) {
    log('⚠️  TESTS PASSED WITH WARNINGS', 'warn');
  } else {
    log('✅ ALL TESTS PASSED', 'info');
  }
  log('='.repeat(60), 'info');
  
  // Exit with appropriate code
  process.exit(hasErrors ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
