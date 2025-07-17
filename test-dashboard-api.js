import fetch from 'node-fetch';

async function testDashboardAPIs() {
  const baseUrl = 'http://localhost:8021';
  
  console.log('🧪 Testing Dashboard API Endpoints...\n');
  
  // Test health endpoint
  try {
    console.log('1. Testing health endpoint...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health endpoint:', healthData.status);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
  }
  
  // Test candidates endpoint (should require auth)
  try {
    console.log('\n2. Testing candidates endpoint (no auth)...');
    const candidatesRes = await fetch(`${baseUrl}/api/candidates`);
    console.log('📊 Candidates response status:', candidatesRes.status);
    if (candidatesRes.status === 401) {
      console.log('✅ Correctly requires authentication');
    } else {
      const candidatesData = await candidatesRes.json();
      console.log('📊 Candidates data:', candidatesData);
    }
  } catch (error) {
    console.log('❌ Candidates endpoint failed:', error.message);
  }
  
  // Test positions endpoint (should be public)
  try {
    console.log('\n3. Testing positions endpoint...');
    const positionsRes = await fetch(`${baseUrl}/api/positions`);
    const positionsData = await positionsRes.json();
    console.log('📊 Positions response status:', positionsRes.status);
    console.log('📊 Positions count:', positionsData.data?.length || 0);
  } catch (error) {
    console.log('❌ Positions endpoint failed:', error.message);
  }
  
  // Test users endpoint (should require auth)
  try {
    console.log('\n4. Testing users endpoint (no auth)...');
    const usersRes = await fetch(`${baseUrl}/api/users`);
    console.log('📊 Users response status:', usersRes.status);
    if (usersRes.status === 401) {
      console.log('✅ Correctly requires authentication');
    } else {
      const usersData = await usersRes.json();
      console.log('📊 Users count:', usersData.length || 0);
    }
  } catch (error) {
    console.log('❌ Users endpoint failed:', error.message);
  }
  
  console.log('\n🏁 Dashboard API testing completed!');
}

testDashboardAPIs().catch(console.error); 