#!/usr/bin/env node

/**
 * Test script for the webhook management system
 * This script creates test webhooks and triggers events to verify the system is working
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://webhook.site/your-unique-url';

// Test credentials (you'll need to update these)
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'admin@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'password';

let sessionToken = null;

async function login() {
  console.log('🔐 Logging in...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        callbackUrl: `${BASE_URL}/`,
        json: 'true'
      })
    });

    if (response.ok) {
      const data = await response.json();
      sessionToken = data.url ? new URL(data.url).searchParams.get('session') : null;
      console.log('✅ Login successful');
    } else {
      throw new Error(`Login failed: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

async function createTestWebhook() {
  console.log('🔗 Creating test webhook...');
  
  const webhookData = {
    name: 'Test Webhook',
    url: TEST_WEBHOOK_URL,
    events: ['candidate.created', 'position.created', 'webhook.test'],
    method: 'POST',
    is_active: true,
    auth_type: 'none',
    headers: {
      'X-Test-Header': 'test-value'
    },
    retry_count: 3,
    timeout: 30
  };

  try {
    const response = await fetch(`${BASE_URL}/api/settings/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${sessionToken}`
      },
      body: JSON.stringify(webhookData)
    });

    if (response.ok) {
      const webhook = await response.json();
      console.log('✅ Test webhook created:', webhook.id);
      return webhook.id;
    } else {
      const error = await response.json();
      throw new Error(`Failed to create webhook: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to create webhook:', error.message);
    return null;
  }
}

async function testWebhook(webhookId) {
  console.log('🧪 Testing webhook...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/settings/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook test successful:', result.message);
    } else {
      const error = await response.json();
      throw new Error(`Webhook test failed: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
  }
}

async function createTestCandidate() {
  console.log('👤 Creating test candidate...');
  
  const candidateData = {
    candidate_info: {
      personal_info: {
        firstname: 'Test',
        lastname: 'Candidate',
        email: 'test.candidate@example.com'
      },
      contact_info: {
        email: 'test.candidate@example.com',
        phone: '+1234567890'
      },
      status: 'new'
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${sessionToken}`
      },
      body: JSON.stringify(candidateData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test candidate created:', result.candidate.id);
      return result.candidate.id;
    } else {
      const error = await response.json();
      throw new Error(`Failed to create candidate: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to create candidate:', error.message);
    return null;
  }
}

async function createTestPosition() {
  console.log('💼 Creating test position...');
  
  const positionData = {
    title: 'Test Position',
    department: 'Engineering',
    description: 'This is a test position for webhook testing',
    isOpen: true,
    position_level: 'Senior'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${sessionToken}`
      },
      body: JSON.stringify(positionData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test position created:', result.id);
      return result.id;
    } else {
      const error = await response.json();
      throw new Error(`Failed to create position: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to create position:', error.message);
    return null;
  }
}

async function checkWebhookLogs(webhookId) {
  console.log('📋 Checking webhook logs...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/settings/webhooks/${webhookId}/logs?limit=10`, {
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Found ${result.logs.length} webhook logs`);
      
      result.logs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.event_type} - ${log.success ? '✅ Success' : '❌ Failed'} (${log.response_status || 'N/A'})`);
        if (!log.success && log.error_message) {
          console.log(`     Error: ${log.error_message}`);
        }
      });
    } else {
      const error = await response.json();
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to check logs:', error.message);
  }
}

async function cleanup(webhookId) {
  console.log('🧹 Cleaning up test webhook...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/settings/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`
      }
    });

    if (response.ok) {
      console.log('✅ Test webhook deleted');
    } else {
      const error = await response.json();
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to delete webhook:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting webhook system test...\n');
  
  // Step 1: Login
  await login();
  
  // Step 2: Create test webhook
  const webhookId = await createTestWebhook();
  if (!webhookId) {
    console.log('❌ Cannot continue without webhook');
    process.exit(1);
  }
  
  // Step 3: Test webhook directly
  await testWebhook(webhookId);
  
  // Step 4: Create test candidate (should trigger webhook)
  await createTestCandidate();
  
  // Step 5: Create test position (should trigger webhook)
  await createTestPosition();
  
  // Step 6: Wait a moment for webhooks to process
  console.log('⏳ Waiting for webhooks to process...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 7: Check webhook logs
  await checkWebhookLogs(webhookId);
  
  // Step 8: Cleanup
  await cleanup(webhookId);
  
  console.log('\n✅ Webhook system test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Check your webhook endpoint to see if it received the test payloads');
  console.log('2. Review the webhook logs in the admin interface');
  console.log('3. Configure real webhooks for your production events');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  login,
  createTestWebhook,
  testWebhook,
  createTestCandidate,
  createTestPosition,
  checkWebhookLogs,
  cleanup
}; 