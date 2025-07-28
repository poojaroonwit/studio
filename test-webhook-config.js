import fetch from 'node-fetch';

async function testWebhookConfig() {
  console.log('🔧 Testing Webhook Configuration...\n');

  const baseUrl = 'http://localhost:8021';
  
  try {
    // Test 1: Check current system settings
    console.log('1. Checking current system settings...');
    const settingsResponse = await fetch(`${baseUrl}/api/settings/system-settings`);
    const settings = await settingsResponse.json();
    
    const webhookSettings = settings.filter(s => s.key.includes('webhook'));
    console.log('   📊 Current webhook settings in database:');
    webhookSettings.forEach(setting => {
      console.log(`      ${setting.key}: ${setting.value || '(empty)'}`);
    });

    // Test 2: Check if settings are being read correctly
    console.log('\n2. Testing webhook URL retrieval...');
    const resumeUrl = webhookSettings.find(s => s.key === 'resumeProcessingWebhookUrl')?.value;
    const generalUrl = webhookSettings.find(s => s.key === 'generalPdfWebhookUrl')?.value;
    
    console.log(`   📝 Resume Processing Webhook URL: ${resumeUrl || '(not set)'}`);
    console.log(`   📝 General PDF Webhook URL: ${generalUrl || '(not set)'}`);

    // Test 3: Test processor with current settings
    console.log('\n3. Testing processor with current settings...');
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

    // Test 4: Check environment variables (if accessible)
    console.log('\n4. Environment variable check...');
    console.log('   ℹ️  Environment variables are server-side only');
    console.log('   ℹ️  Check your .env file for these variables:');
    console.log('      - RESUME_PROCESSING_WEBHOOK_URL');
    console.log('      - GENERAL_PDF_WEBHOOK_URL');

    console.log('\n✅ Webhook configuration test completed!');
    console.log('\n📋 Configuration Priority:');
    console.log('   1. Database settings (from System Settings page)');
    console.log('   2. Environment variables (fallback)');
    console.log('   3. No webhook processing (if both empty)');

    if (!resumeUrl && !generalUrl) {
      console.log('\n⚠️  WARNING: No webhook URLs configured!');
      console.log('   To configure webhooks:');
      console.log('   1. Go to Settings → System Settings → Automation tab');
      console.log('   2. Set Resume Processing Webhook URL');
      console.log('   3. Set General PDF Webhook URL');
      console.log('   4. Save settings');
    } else {
      console.log('\n✅ Webhook URLs are configured!');
    }

  } catch (error) {
    console.error('❌ Error testing webhook config:', error.message);
  }
}

testWebhookConfig().catch(console.error); 