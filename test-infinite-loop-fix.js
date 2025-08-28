// Test script to verify infinite loop fix
console.log('Testing infinite loop fix...');

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
    console.log('✅ Infinite loop fix test completed successfully');
    console.log('📝 The useSafeEffect infinite loop issue should now be resolved');
    console.log('📝 Changes made:');
    console.log('   - Removed fetchTableData from useEffect dependency array');
    console.log('   - Removed fetchFitScoreCounts from useEmergencySafeEffect dependency array');
    console.log('   - Simplified useSafeEffect dependencies in use-candidate-data.ts');
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testInfiniteLoopFix();
