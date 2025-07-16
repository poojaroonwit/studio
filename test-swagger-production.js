#!/usr/bin/env node

/**
 * Test script to verify Swagger API configuration for production server
 * This script helps test if the Swagger API is properly configured to use the production server
 */

import https from 'https';
import http from 'http';

// Production server configuration
const PRODUCTION_HOST = '10.0.10.71';
const PRODUCTION_PORT = 8021;
const PRODUCTION_URL = `http://${PRODUCTION_HOST}:${PRODUCTION_PORT}`;

// Test endpoints
const TEST_ENDPOINTS = [
  '/api-docs',
  '/api/v1/health',
  '/api/health'
];

console.log('🔍 Testing Swagger API Configuration for Production Server');
console.log('=' .repeat(60));
console.log(`Production Server: ${PRODUCTION_URL}`);
console.log('');

async function testEndpoint(url, endpoint) {
  return new Promise((resolve) => {
    const fullUrl = `${url}${endpoint}`;
    console.log(`Testing: ${fullUrl}`);
    
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(fullUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  ✅ Status: ${res.statusCode}`);
        console.log(`  📄 Content-Type: ${res.headers['content-type'] || 'N/A'}`);
        
        if (endpoint === '/api-docs') {
          try {
            const swaggerSpec = JSON.parse(data);
            console.log(`  🔧 Swagger Servers: ${swaggerSpec.servers?.length || 0} configured`);
            swaggerSpec.servers?.forEach((server, index) => {
              console.log(`     ${index + 1}. ${server.url} (${server.description})`);
            });
          } catch (e) {
            console.log(`  ❌ Failed to parse Swagger spec: ${e.message}`);
          }
        }
        
        console.log('');
        resolve({ status: res.statusCode, success: res.statusCode < 400 });
      });
    });
    
    req.on('error', (err) => {
      console.log(`  ❌ Error: ${err.message}`);
      console.log('');
      resolve({ status: 0, success: false, error: err.message });
    });
    
    req.setTimeout(10000, () => {
      console.log(`  ⏰ Timeout after 10 seconds`);
      console.log('');
      req.destroy();
      resolve({ status: 0, success: false, error: 'Timeout' });
    });
  });
}

async function runTests() {
  console.log('🚀 Starting API tests...\n');
  
  let successCount = 0;
  let totalTests = TEST_ENDPOINTS.length;
  
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(PRODUCTION_URL, endpoint);
    if (result.success) {
      successCount++;
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`📊 Test Results: ${successCount}/${totalTests} endpoints accessible`);
  
  if (successCount === totalTests) {
    console.log('🎉 All tests passed! Production server is accessible.');
    console.log('💡 You can now use the Swagger UI to test API endpoints against the production server.');
  } else {
    console.log('⚠️  Some tests failed. Please check your production server configuration.');
  }
  
  console.log('\n🔗 Swagger UI URLs:');
  console.log(`   Local: http://localhost:8021/settings/api-docs`);
  console.log(`   Production: ${PRODUCTION_URL}/settings/api-docs`);
  console.log('\n📝 Instructions:');
  console.log('   1. Open the Swagger UI in your browser');
  console.log('   2. In the server dropdown (top right), select "Production server"');
  console.log('   3. Use the "Try it out" button to test API endpoints');
  console.log('   4. For authenticated endpoints, you\'ll need to login first via /api/v1/auth/login');
}

// Run the tests
runTests().catch(console.error); 