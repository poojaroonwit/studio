const fetch = require('node-fetch');

async function testUploadQueueLimit() {
  console.log('🧪 Testing upload queue API limits with date filtering...');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8021';
  
  try {
    // Test 1: Regular request with limit 50 (should work)
    console.log('\n📊 Test 1: Regular request with limit 50');
    const response1 = await fetch(`${baseUrl}/api/upload-queue?limit=50`);
    const data1 = await response1.json();
    console.log(`✅ Status: ${response1.status}, Jobs returned: ${data1.data?.length || 0}`);
    
    // Test 2: Analytics request with limit 1000 and date filter (should work now)
    console.log('\n📊 Test 2: Analytics request with limit 1000 and 30-day date filter');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();
    
    const response2 = await fetch(`${baseUrl}/api/upload-queue?limit=1000&date_start=${thirtyDaysAgo.toISOString()}&date_end=${now.toISOString()}`);
    const data2 = await response2.json();
    console.log(`✅ Status: ${response2.status}, Jobs returned: ${data2.data?.length || 0}`);
    
    // Test 3: Very high limit (should be capped at 1000)
    console.log('\n📊 Test 3: Very high limit (should be capped at 1000)');
    const response3 = await fetch(`${baseUrl}/api/upload-queue?limit=5000`);
    const data3 = await response3.json();
    console.log(`✅ Status: ${response3.status}, Jobs returned: ${data3.data?.length || 0}`);
    
    // Test 4: Check total count
    console.log('\n📊 Test 4: Check total count');
    const response4 = await fetch(`${baseUrl}/api/upload-queue/count`);
    const data4 = await response4.json();
    console.log(`✅ Total jobs in queue: ${data4.total}`);
    
    console.log('\n🎉 All tests completed!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`- Regular limit (50): ${data1.data?.length || 0} jobs`);
    console.log(`- Analytics limit (1000) with 30-day filter: ${data2.data?.length || 0} jobs`);
    console.log(`- High limit (5000): ${data3.data?.length || 0} jobs (capped)`);
    console.log(`- Total available: ${data4.total} jobs`);
    
    if (data2.data?.length > 100) {
      console.log('\n✅ SUCCESS: Analytics can now fetch more than 100 jobs with date filtering!');
    } else {
      console.log('\n⚠️  WARNING: Analytics still limited to 100 jobs or less');
    }
    
    // Test date filtering effectiveness
    if (data2.data?.length < data4.total) {
      console.log('\n✅ SUCCESS: Date filtering is working - showing subset of total jobs');
    } else {
      console.log('\n⚠️  NOTE: Date filter showing all jobs (may be expected if all jobs are recent)');
    }
    
  } catch (error) {
    console.error('❌ Error testing upload queue limits:', error);
  }
}

testUploadQueueLimit();
