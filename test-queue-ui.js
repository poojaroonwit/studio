import fetch from 'node-fetch';

async function testQueueUI() {
  console.log('🧪 Testing Upload Queue UI Behavior...\n');

  const baseUrl = 'http://localhost:8021';
  
  try {
    // Test 1: Check current queue status
    console.log('1. Checking current upload queue status...');
    const response = await fetch(`${baseUrl}/api/upload-queue?limit=10&offset=0`);
    const data = await response.json();
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Total jobs: ${data.total}`);
    console.log(`   📈 Summary:`, data.summary);
    
    if (data.total === 0) {
      console.log('   🎯 Queue is empty - UI should show "No queue" message');
    } else {
      console.log(`   📝 Found ${data.total} jobs in queue`);
    }

    // Test 2: Check system settings
    console.log('\n2. Checking system settings...');
    const settingsResponse = await fetch(`${baseUrl}/api/settings/system-settings`);
    const settings = await settingsResponse.json();
    
    const webhookSettings = settings.filter(s => s.key.includes('webhook'));
    console.log('   📊 Webhook settings:');
    webhookSettings.forEach(setting => {
      console.log(`      ${setting.key}: ${setting.value || '(empty)'}`);
    });

    // Test 3: Test processor endpoint
    console.log('\n3. Testing processor endpoint...');
    const processorResponse = await fetch(`${baseUrl}/api/upload-queue/process`, {
      method: 'POST',
      headers: {
        'x-api-key': 'dev-key',
        'Content-Type': 'application/json'
      }
    });
    
    const processorData = await processorResponse.json();
    console.log(`   ✅ Processor response: ${processorResponse.status}`);
    console.log(`   📝 Message: ${processorData.message || 'No message'}`);

    console.log('\n✅ Queue UI test completed!');
    console.log('\n📋 Expected UI Behavior:');
    console.log('   - If queue is empty: Should show "No queue" with inbox icon');
    console.log('   - If queue has jobs: Should show job list');
    console.log('   - Status cards: Should show actual counts (0 when empty)');
    console.log('   - No loading spinner when queue is empty');

  } catch (error) {
    console.error('❌ Error testing queue UI:', error.message);
  }
}

testQueueUI().catch(console.error); 