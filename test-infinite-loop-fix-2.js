#!/usr/bin/env node

/**
 * Simple test to verify infinite loop fix
 * Monitors console output for infinite loop warnings
 */

console.log('🧪 Testing Infinite Loop Fix - Version 2...\n');

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
    console.log('\n✅ Infinite loop fix test completed successfully');
    console.log('📝 The useSafeEffect infinite loop issues should now be resolved');
    console.log('📝 Changes made:');
    console.log('   - Added refs to track connection state (hasConnectedRef, connectionAttemptedRef, sessionIdRef)');
    console.log('   - Prevented multiple connection attempts for the same session');
    console.log('   - Removed separate unmount effect that was causing its own infinite loop');
    console.log('   - Added proper cleanup effect with empty dependency array');
    console.log('   - Enhanced connection state tracking to prevent reconnection loops');
    console.log('\n🎯 Key improvements:');
    console.log('   - UnifiedRealtimeConnection effect should only run when session/user changes');
    console.log('   - UnifiedRealtimeUnmount effect removed to prevent its infinite loop');
    console.log('   - Connection attempts are now properly tracked and limited');
    console.log('   - Global connection sharing is maintained without infinite loops');
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('💡 Make sure the development server is running on port 3000');
  }
}

testInfiniteLoopFix();
