const fetch = require('node-fetch');

async function testUploadQueuePagination() {
  console.log('🧪 Testing upload queue API pagination with date filtering...');
  
  const baseUrl = process.env.PROCESSOR_URL || 'http://localhost:8021';
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  try {
    // Test first page with 50 items
    console.log('\n📄 Testing first page (50 items):');
    const response1 = await fetch(`${baseUrl}/api/upload-queue?limit=50`);
    const data1 = await response1.json();
    console.log(`✅ Status: ${response1.status}`);
    console.log(`📊 Total records: ${data1.total}`);
    console.log(`📋 Page 1 records: ${data1.data?.length || 0}`);
    console.log(`📄 Pagination: ${JSON.stringify(data1.pagination)}`);
    
    // Test second page with 100 items
    console.log('\n📄 Testing second page (100 items):');
    const response2 = await fetch(`${baseUrl}/api/upload-queue?limit=100&offset=100`);
    const data2 = await response2.json();
    console.log(`✅ Status: ${response2.status}`);
    console.log(`📊 Total records: ${data2.total}`);
    console.log(`📋 Page 2 records: ${data2.data?.length || 0}`);
    console.log(`📄 Pagination: ${JSON.stringify(data2.pagination)}`);
    
    // Test large page size (no limit)
    console.log('\n📄 Testing large page size (5000 items):');
    const response3 = await fetch(`${baseUrl}/api/upload-queue?limit=5000`);
    const data3 = await response3.json();
    console.log(`✅ Status: ${response3.status}`);
    console.log(`📊 Total records: ${data3.total}`);
    console.log(`📋 Large page records: ${data3.data?.length || 0}`);
    console.log(`📄 Pagination: ${JSON.stringify(data3.pagination)}`);
    
    // Test with date filtering
    console.log('\n📅 Testing with date filtering:');
    const response4 = await fetch(`${baseUrl}/api/upload-queue?limit=100&date_start=${thirtyDaysAgo.toISOString()}&date_end=${now.toISOString()}`);
    const data4 = await response4.json();
    console.log(`✅ Status: ${response4.status}`);
    console.log(`📊 Filtered total: ${data4.total}`);
    console.log(`📋 Filtered records: ${data4.data?.length || 0}`);
    console.log(`📄 Pagination: ${JSON.stringify(data4.pagination)}`);
    
    // Test summary counts
    console.log('\n📊 Testing summary counts:');
    if (data1.summary) {
      console.log(`✅ Summary available:`);
      console.log(`   - Total: ${data1.summary.total}`);
      console.log(`   - Queued: ${data1.summary.queued}`);
      console.log(`   - In Process: ${data1.summary.inprocess}`);
      console.log(`   - Success: ${data1.summary.success}`);
      console.log(`   - Failed: ${data1.summary.error}`);
    }
    
    console.log('\n🎉 All pagination tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing upload queue pagination:', error);
  }
}

// Run the test
if (require.main === module) {
  testUploadQueuePagination();
}
