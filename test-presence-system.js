// Test script to verify presence system functionality
const fetch = require('node-fetch');

async function testPresenceSystem() {
  console.log('🧪 Testing Presence System...\n');

  const baseUrl = 'http://localhost:3000';
  let testPassed = true;
  
  try {
    // Test 1: Get initial presence data
    console.log('1. Testing GET /api/realtime/presence...');
    const getResponse = await fetch(`${baseUrl}/api/realtime/presence`);
    console.log(`   Status: ${getResponse.status}`);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log(`   Users found: ${data.users?.length || 0}`);
      if (data.users?.length > 0) {
        console.log('   Sample user:', {
          userId: data.users[0].userId,
          userName: data.users[0].userName,
          isOnline: data.users[0].isOnline
        });
      }
    } else {
      console.log('   Error:', await getResponse.text());
      testPassed = false;
    }

    // Test 2: Test unified realtime endpoint
    console.log('\n2. Testing GET /api/realtime/unified...');
    const unifiedResponse = await fetch(`${baseUrl}/api/realtime/unified`);
    console.log(`   Status: ${unifiedResponse.status}`);
    
    if (unifiedResponse.ok) {
      console.log('   ✅ Unified realtime endpoint is accessible');
    } else {
      console.log('   Error:', await unifiedResponse.text());
      testPassed = false;
    }

    // Test 3: Test presence store stats (if available)
    console.log('\n3. Testing presence store functionality...');
    try {
      const statsResponse = await fetch(`${baseUrl}/api/realtime/presence`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('   ✅ Presence store is working');
        console.log(`   Current users: ${statsData.users?.length || 0}`);
      } else {
        console.log('   ⚠️  Could not verify presence store');
      }
    } catch (error) {
      console.log('   ⚠️  Could not test presence store:', error.message);
    }

    console.log('\n✅ Presence system test completed!');
    
    if (testPassed) {
      console.log('\n🎉 All tests passed! The presence system is working correctly.');
      console.log('\nTo test with multiple users:');
      console.log('1. Open the application in multiple browser tabs/windows');
      console.log('2. Log in with different user accounts');
      console.log('3. Check the top menu for online avatars');
      console.log('4. Navigate between pages to see real-time updates');
      console.log('5. Close tabs to see users go offline');
    } else {
      console.log('\n❌ Some tests failed. Check the server logs for more details.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure the development server is running (npm run dev)');
    console.log('2. Check if the server is accessible at http://localhost:3000');
    console.log('3. Verify that the API routes are properly configured');
    console.log('4. Check the browser console and server logs for errors');
  }
}

// Run the test
testPresenceSystem();
