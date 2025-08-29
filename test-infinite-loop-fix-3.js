#!/usr/bin/env node

/**
 * Test script to verify infinite loop fix - Version 3
 * This script checks if the server is running and provides guidance
 */

console.log('🧪 Testing Infinite Loop Fix - Version 3...\n');

// Check if the development server is running
const http = require('http');

function checkServer() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log('✅ Server is running (status:', res.statusCode, ')');
      resolve(true);
    });

    req.on('error', (err) => {
      console.log('❌ Server is not running:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.log('❌ Server timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function testInfiniteLoopFix() {
  try {
    await checkServer();
    console.log('\n✅ Server connectivity test passed');
    console.log('📝 To verify the infinite loop fix:');
    console.log('   1. Open the browser console');
    console.log('   2. Look for any "useSafeEffect" warnings');
    console.log('   3. Navigate between pages to trigger realtime connections');
    console.log('   4. Verify no infinite loop warnings appear');
    console.log('\n🎯 Expected behavior:');
    console.log('   - No "UnifiedRealtimeConnection" warnings');
    console.log('   - No "UnifiedRealtimeUnmount" warnings');
    console.log('   - Application runs smoothly without freezing');
    console.log('   - Real-time connections work properly');
    console.log('\n🔧 If you still see infinite loop warnings:');
    console.log('   1. Clear browser cache and reload');
    console.log('   2. Check if multiple components are using the hook');
    console.log('   3. Verify the changes were applied correctly');
    console.log('   4. Restart the development server');
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('💡 Make sure the development server is running on port 3000');
    console.log('   Run: npm run dev');
  }
}

testInfiniteLoopFix();
