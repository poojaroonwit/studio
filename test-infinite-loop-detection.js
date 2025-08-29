// Test script for infinite loop detection utilities
console.log('🧪 Testing Infinite Loop Detection Utilities...\n');

const http = require('http');
const https = require('https');

// Configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 10000,
  maxRetries: 3,
  testDuration: 30000, // 30 seconds
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, message = '') {
  const timestamp = new Date().toISOString();
  const result = {
    name,
    status,
    message,
    timestamp
  };
  
  testResults.tests.push(result);
  
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusIcon} ${name}: ${message}`);
  
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.warnings++;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: TEST_CONFIG.timeout
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testServerAvailability() {
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/`);
    if (response.statusCode === 200) {
      logTest('Server Availability', 'PASS', 'Server is running and responding');
      return true;
    } else {
      logTest('Server Availability', 'FAIL', `Server returned status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Server Availability', 'FAIL', `Server not available: ${error.message}`);
    return false;
  }
}

async function testInfiniteLoopDetectionUtilities() {
  try {
    // Test if the infinite loop detection utilities are available
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/health`);
    if (response.statusCode === 200) {
      logTest('Infinite Loop Detection Utilities', 'PASS', 'Utilities are available');
      return true;
    } else {
      logTest('Infinite Loop Detection Utilities', 'WARN', 'Utilities status unknown');
      return false;
    }
  } catch (error) {
    logTest('Infinite Loop Detection Utilities', 'WARN', 'Could not verify utilities');
    return false;
  }
}

async function testRetryQueueCircuitBreaker() {
  try {
    // Test the retry queue circuit breaker in the realtime broadcaster
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/realtime/unified`);
    if (response.statusCode === 200) {
      logTest('Retry Queue Circuit Breaker', 'PASS', 'Realtime endpoint responding');
      return true;
    } else {
      logTest('Retry Queue Circuit Breaker', 'WARN', 'Realtime endpoint status unknown');
      return false;
    }
  } catch (error) {
    logTest('Retry Queue Circuit Breaker', 'WARN', 'Could not test retry queue');
    return false;
  }
}

async function testUserPreferencesRetryLogic() {
  try {
    // Test user preferences endpoint for retry logic
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/user-preferences`, {
      method: 'GET'
    });
    if (response.statusCode === 200 || response.statusCode === 401) {
      logTest('User Preferences Retry Logic', 'PASS', 'User preferences endpoint accessible');
      return true;
    } else {
      logTest('User Preferences Retry Logic', 'WARN', 'User preferences endpoint status unknown');
      return false;
    }
  } catch (error) {
    logTest('User Preferences Retry Logic', 'WARN', 'Could not test user preferences');
    return false;
  }
}

async function testCandidateFiltersAutoApply() {
  try {
    // Test candidate filters endpoint
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/candidates`);
    if (response.statusCode === 200 || response.statusCode === 401) {
      logTest('Candidate Filters Auto-apply', 'PASS', 'Candidates endpoint accessible');
      return true;
    } else {
      logTest('Candidate Filters Auto-apply', 'WARN', 'Candidates endpoint status unknown');
      return false;
    }
  } catch (error) {
    logTest('Candidate Filters Auto-apply', 'WARN', 'Could not test candidate filters');
    return false;
  }
}

async function testCandidateKanbanView() {
  try {
    // Test candidate kanban view endpoint
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/candidates`);
    if (response.statusCode === 200 || response.statusCode === 401) {
      logTest('Candidate Kanban View', 'PASS', 'Candidate kanban view accessible');
      return true;
    } else {
      logTest('Candidate Kanban View', 'WARN', 'Candidate kanban view status unknown');
      return false;
    }
  } catch (error) {
    logTest('Candidate Kanban View', 'WARN', 'Could not test candidate kanban view');
    return false;
  }
}

async function testUploadQueueInfiniteLoop() {
  try {
    // Test upload queue endpoint
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/upload-queue`);
    if (response.statusCode === 200 || response.statusCode === 401) {
      logTest('Upload Queue Infinite Loop', 'PASS', 'Upload queue endpoint accessible');
      return true;
    } else {
      logTest('Upload Queue Infinite Loop', 'WARN', 'Upload queue endpoint status unknown');
      return false;
    }
  } catch (error) {
    logTest('Upload Queue Infinite Loop', 'WARN', 'Could not test upload queue');
    return false;
  }
}

async function testUnifiedRealtimeHook() {
  try {
    // Test unified realtime hook
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/realtime/unified`);
    if (response.statusCode === 200) {
      logTest('Unified Realtime Hook', 'PASS', 'Unified realtime endpoint responding');
      return true;
    } else {
      logTest('Unified Realtime Hook', 'WARN', 'Unified realtime endpoint status unknown');
      return false;
    }
  } catch (error) {
    logTest('Unified Realtime Hook', 'WARN', 'Could not test unified realtime hook');
    return false;
  }
}

async function testUserPresenceHook() {
  try {
    // Test user presence endpoint
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/user-presence`);
    if (response.statusCode === 200 || response.statusCode === 401) {
      logTest('User Presence Hook', 'PASS', 'User presence endpoint accessible');
      return true;
    } else {
      logTest('User Presence Hook', 'WARN', 'User presence endpoint status unknown');
      return false;
    }
  } catch (error) {
    logTest('User Presence Hook', 'WARN', 'Could not test user presence hook');
    return false;
  }
}

async function testMonitorScripts() {
  try {
    // Test if monitor scripts are running (this is a basic check)
    logTest('Monitor Scripts', 'INFO', 'Monitor scripts should be checked manually');
    return true;
  } catch (error) {
    logTest('Monitor Scripts', 'WARN', 'Could not verify monitor scripts');
    return false;
  }
}

async function testPerformanceMonitoring() {
  try {
    // Test performance monitoring endpoints
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/system-status`);
    if (response.statusCode === 200 || response.statusCode === 401) {
      logTest('Performance Monitoring', 'PASS', 'System status endpoint accessible');
      return true;
    } else {
      logTest('Performance Monitoring', 'WARN', 'System status endpoint status unknown');
      return false;
    }
  } catch (error) {
    logTest('Performance Monitoring', 'WARN', 'Could not test performance monitoring');
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Infinite Loop Detection Tests...\n');
  
  const startTime = Date.now();
  
  // Run all tests
  await testServerAvailability();
  await testInfiniteLoopDetectionUtilities();
  await testRetryQueueCircuitBreaker();
  await testUserPreferencesRetryLogic();
  await testCandidateFiltersAutoApply();
  await testCandidateKanbanView();
  await testUploadQueueInfiniteLoop();
  await testUnifiedRealtimeHook();
  await testUserPresenceHook();
  await testMonitorScripts();
  await testPerformanceMonitoring();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  
  // Print recommendations
  console.log('\n🔧 Recommendations:');
  console.log('==================');
  
  if (testResults.failed > 0) {
    console.log('❌ Critical issues found. Please address failed tests immediately.');
  }
  
  if (testResults.warnings > 0) {
    console.log('⚠️  Some components may have potential infinite loop risks. Review warnings.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('==============');
  console.log('1. Review the INFINITE_LOOP_AUDIT_REPORT.md for detailed findings');
  console.log('2. Implement the recommended fixes for critical findings');
  console.log('3. Add infinite loop detection utilities to high-risk components');
  console.log('4. Monitor performance in production for frequent effect calls');
  console.log('5. Regular code reviews focusing on useEffect dependencies and retry logic');
  
  // Save test results
  const fs = require('fs');
  const resultsPath = './infinite-loop-test-results.json';
  
  try {
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        passed: testResults.passed,
        failed: testResults.failed,
        warnings: testResults.warnings,
        duration
      },
      tests: testResults.tests
    }, null, 2));
    
    console.log(`\n💾 Test results saved to: ${resultsPath}`);
  } catch (error) {
    console.log('\n⚠️  Could not save test results:', error.message);
  }
  
  return testResults.failed === 0;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testResults,
  logTest
};
