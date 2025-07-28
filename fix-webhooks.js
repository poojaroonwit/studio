import fetch from 'node-fetch';

async function fixWebhooks() {
  console.log('🔧 Fixing webhook configuration...\n');

  const baseUrl = 'http://localhost:8021';
  
  try {
    // Disable problematic webhooks
    console.log('1. Disabling problematic webhooks...');
    const response = await fetch(`${baseUrl}/api/settings/system-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        { key: 'resumeProcessingWebhookUrl', value: '' },
        { key: 'generalPdfWebhookUrl', value: '' }
      ])
    });

    if (response.ok) {
      console.log('   ✅ Webhooks disabled successfully');
    } else {
      console.log(`   ❌ Failed to disable webhooks: ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }

    // Test processor without webhooks
    console.log('\n2. Testing processor without webhooks...');
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

    // Check current webhook configuration
    console.log('\n3. Checking current webhook configuration...');
    const settingsResponse = await fetch(`${baseUrl}/api/settings/system-settings`);
    const settings = await settingsResponse.json();
    
    const webhookSettings = settings.filter(s => s.key.includes('webhook'));
    console.log('   📊 Current webhook settings:');
    webhookSettings.forEach(setting => {
      console.log(`      ${setting.key}: ${setting.value || '(empty)'}`);
    });

    console.log('\n✅ Webhook fix completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Upload queue processor should now work without webhook errors');
    console.log('   2. Jobs will be processed and status updated');
    console.log('   3. Configure working webhooks when ready');
    console.log('   4. Monitor logs: docker-compose logs -f app');

  } catch (error) {
    console.error('❌ Error fixing webhooks:', error.message);
  }
}

fixWebhooks().catch(console.error); 