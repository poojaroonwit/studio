const fetch = require('node-fetch');

async function testProcessor() {
  console.log('🧪 Testing Upload Queue Processor...\n');

  const baseUrl = 'http://localhost:8021';
  const apiKey = 'dev-key';
  
  // Test 1: Check if processor endpoint is accessible
  console.log('1. Testing: Processor endpoint accessibility');
  try {
    const response = await fetch(`${baseUrl}/api/upload-queue/process`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📝 Response:`, data);
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  // Test 2: Check upload queue status
  console.log('\n2. Testing: Upload queue status');
  try {
    const response = await fetch(`${baseUrl}/api/upload-queue?limit=5&offset=0`);
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Total jobs: ${data.total}`);
    console.log(`   📈 Summary:`, data.summary);
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  // Test 3: Check system settings for max concurrent processors
  console.log('\n3. Testing: System settings');
  try {
    const response = await fetch(`${baseUrl}/api/settings/system-settings`);
    const data = await response.json();
    const maxConcurrent = data.find(s => s.key === 'maxConcurrentProcessors');
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   🔧 Max Concurrent Processors: ${maxConcurrent?.value || 'Not set'}`);
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  console.log('\n✅ Test completed!');
}

testProcessor().catch(console.error); 