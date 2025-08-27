#!/usr/bin/env node

/**
 * Docker Network Connectivity Test
 * 
 * This script tests connectivity between Docker services
 * to help diagnose network issues.
 */

const http = require('http');
const https = require('https');

console.log('🔍 Docker Network Connectivity Test\n');

// Test URLs
const testUrls = [
  'http://app:8021/api/health',
  'http://localhost:8021/api/health',
  'http://postgres:5432',
  'http://minio:9000/minio/health/live'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`🔍 Testing: ${url}`);
    
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'DockerNetworkTest/1.0'
      }
    }, (res) => {
      console.log(`✅ ${url} - Status: ${res.statusCode}`);
      resolve();
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${url} - Error: ${error.message}`);
      resolve();
    });
    
    req.on('timeout', () => {
      console.log(`⏰ ${url} - Timeout`);
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting network connectivity tests...\n');
  
  for (const url of testUrls) {
    await testUrl(url);
    console.log('');
  }
  
  console.log('📋 Test Summary:');
  console.log('- If app:8021 fails but localhost:8021 works: Docker network issue');
  console.log('- If both fail: App service not running');
  console.log('- If postgres:5432 fails: Database connectivity issue');
  console.log('- If minio:9000 fails: MinIO connectivity issue');
}

runTests().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
