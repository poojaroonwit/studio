import fetch from 'node-fetch';

async function testUploadQueueFilter() {
  console.log('🧪 Testing Upload Queue Filter...\n');

  const baseUrl = 'http://localhost:8021';
  
  // Test 1: Get all upload queue items
  console.log('1. Testing: Get all upload queue items');
  try {
    const response = await fetch(`${baseUrl}/api/upload-queue?limit=10&offset=0`);
    const data = await response.json();
    console.log(`   ✅ Success: Found ${data.total} total items`);
    console.log(`   📊 Summary:`, data.summary);
    console.log(`   📝 First item:`, data.data[0]?.file_name || 'No items');
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  // Test 2: Filter by status "Error"
  console.log('\n2. Testing: Filter by status "Error"');
  try {
    const response = await fetch(`${baseUrl}/api/upload-queue?status=error,fail&limit=10&offset=0`);
    const data = await response.json();
    console.log(`   ✅ Success: Found ${data.total} error items`);
    console.log(`   📊 Summary:`, data.summary);
    console.log(`   📝 Error items:`, data.data.map(item => item.file_name).join(', ') || 'No error items');
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  // Test 3: Filter by status "Success"
  console.log('\n3. Testing: Filter by status "Success"');
  try {
    const response = await fetch(`${baseUrl}/api/upload-queue?status=success&limit=10&offset=0`);
    const data = await response.json();
    console.log(`   ✅ Success: Found ${data.total} success items`);
    console.log(`   📊 Summary:`, data.summary);
    console.log(`   📝 Success items:`, data.data.map(item => item.file_name).join(', ') || 'No success items');
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  // Test 4: Filter by file name
  console.log('\n4. Testing: Filter by file name');
  try {
    const response = await fetch(`${baseUrl}/api/upload-queue?file_name=resume&limit=10&offset=0`);
    const data = await response.json();
    console.log(`   ✅ Success: Found ${data.total} items with "resume" in name`);
    console.log(`   📝 Matching items:`, data.data.map(item => item.file_name).join(', ') || 'No matching items');
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  // Test 5: Filter by date range
  console.log('\n5. Testing: Filter by date range');
  try {
    const response = await fetch(`${baseUrl}/api/upload-queue?date_start=2024-01-01&date_end=2024-12-31&limit=10&offset=0`);
    const data = await response.json();
    console.log(`   ✅ Success: Found ${data.total} items in date range`);
    console.log(`   📝 Items in range:`, data.data.map(item => item.file_name).join(', ') || 'No items in range');
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  console.log('\n🎉 Filter testing completed!');
}

testUploadQueueFilter().catch(console.error); 