// Test script to check fit score data
// This script will help us understand what's in the database

console.log('🔍 Testing fit score data...');

// Since we can't access the database directly without the environment variables,
// let's create a simple test to check if the API is working

// Test 1: Check if the server is running
const http = require('http');

function testServer() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8021,
      path: '/api/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('🔍 Server health check response:', res.statusCode, data);
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log('🔍 Server health check error:', error.message);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  try {
    console.log('🔍 Running tests...');
    
    // Test server health
    await testServer();
    
    console.log('🔍 Tests completed. Check the browser console for API debug logs.');
    console.log('🔍 Navigate to http://localhost:8021/candidates and check the console.');
    
  } catch (error) {
    console.error('🔍 Test error:', error);
  }
}

runTests();
