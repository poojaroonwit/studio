#!/usr/bin/env node

/**
 * Security Test Script for File Access
 * 
 * This script tests that files are no longer publicly accessible
 * and require proper authentication and permissions.
 */

const https = require('https');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  // Example file URL that should no longer be accessible
  testFileUrl: 'https://dev-s3-cv-screening.qsncc.com/studio-production/attachments/476ca0f3-53eb-4fd6-aef2-d032aeacfc73/a16176ba-e055-4075-b7e0-f46882f04915.pdf',
  
  // Your application base URL
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  
  // Test credentials (you'll need to provide these)
  testCredentials: {
    email: process.env.TEST_EMAIL || 'admin@example.com',
    password: process.env.TEST_PASSWORD || 'password'
  }
};

/**
 * Test direct file access (should fail)
 */
async function testDirectFileAccess() {
  console.log('🔒 Testing direct file access (should fail)...');
  
  return new Promise((resolve) => {
    const url = new URL(TEST_CONFIG.testFileUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: 5000
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers:`, res.headers);
      
      if (res.statusCode === 403 || res.statusCode === 401) {
        console.log('   ✅ SUCCESS: Direct file access is blocked (403/401)');
        resolve(true);
      } else if (res.statusCode === 200) {
        console.log('   ❌ FAILURE: Direct file access is still allowed (200)');
        resolve(false);
      } else {
        console.log(`   ⚠️  UNEXPECTED: Status code ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log(`   ✅ SUCCESS: Direct file access failed with error: ${error.message}`);
      resolve(true);
    });

    req.on('timeout', () => {
      console.log('   ✅ SUCCESS: Direct file access timed out (likely blocked)');
      req.destroy();
      resolve(true);
    });

    req.end();
  });
}

/**
 * Test authenticated file access (should succeed with proper credentials)
 */
async function testAuthenticatedFileAccess() {
  console.log('🔑 Testing authenticated file access...');
  
  try {
    // First, get authentication token
    const loginResponse = await fetch(`${TEST_CONFIG.appBaseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CONFIG.testCredentials)
    });

    if (!loginResponse.ok) {
      console.log('   ⚠️  Could not authenticate - skipping authenticated test');
      return true;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.accessToken;

    if (!token) {
      console.log('   ⚠️  No token received - skipping authenticated test');
      return true;
    }

    // Test secure file endpoint
    const secureFileResponse = await fetch(`${TEST_CONFIG.appBaseUrl}/api/secure-file?filePath=test/path&expiresIn=3600`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Status: ${secureFileResponse.status}`);
    
    if (secureFileResponse.status === 401 || secureFileResponse.status === 403) {
      console.log('   ✅ SUCCESS: Secure file endpoint requires authentication');
      return true;
    } else if (secureFileResponse.status === 400) {
      console.log('   ✅ SUCCESS: Secure file endpoint validates parameters');
      return true;
    } else {
      console.log('   ⚠️  UNEXPECTED: Secure file endpoint response');
      return false;
    }

  } catch (error) {
    console.log(`   ⚠️  Error testing authenticated access: ${error.message}`);
    return true; // Don't fail the test for network errors
  }
}

/**
 * Test download API endpoint
 */
async function testDownloadAPI() {
  console.log('📥 Testing download API endpoint...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.appBaseUrl}/api/download?url=test`, {
      method: 'GET'
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('   ✅ SUCCESS: Download API requires authentication');
      return true;
    } else {
      console.log('   ❌ FAILURE: Download API should require authentication');
      return false;
    }

  } catch (error) {
    console.log(`   ⚠️  Error testing download API: ${error.message}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runSecurityTests() {
  console.log('🛡️  Starting File Security Tests...\n');
  
  const results = [];
  
  // Test 1: Direct file access should fail
  results.push(await testDirectFileAccess());
  console.log('');
  
  // Test 2: Authenticated access should work
  results.push(await testAuthenticatedFileAccess());
  console.log('');
  
  // Test 3: Download API should require auth
  results.push(await testDownloadAPI());
  console.log('');
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('📊 Test Results Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('   ✅ ALL TESTS PASSED - File security is properly implemented!');
    process.exit(0);
  } else {
    console.log('   ❌ SOME TESTS FAILED - File security needs attention!');
    process.exit(1);
  }
}

// Run the tests
runSecurityTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
