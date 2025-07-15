#!/usr/bin/env node

/**
 * Webhook System Test Script
 * 
 * This script tests the webhook functionality by:
 * 1. Creating a test webhook
 * 2. Testing the webhook
 * 3. Checking the logs
 * 4. Cleaning up
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://webhook.site/your-unique-url';

async function testWebhookSystem() {
  console.log('🧪 Testing Webhook System...\n');

  try {
    // Step 1: Create a test webhook
    console.log('1. Creating test webhook...');
    const createResponse = await fetch(`${BASE_URL}/api/settings/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your authentication headers here if needed
      },
      body: JSON.stringify({
        name: 'Test Webhook',
        url: TEST_WEBHOOK_URL,
        events: ['webhook.test', 'candidate.created'],
        method: 'POST',
        is_active: true,
        auth_type: 'none',
        headers: {},
        retry_count: 3,
        timeout: 30
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create webhook: ${createResponse.status} ${createResponse.statusText}`);
    }

    const webhook = await createResponse.json();
    console.log(`✅ Webhook created with ID: ${webhook.id}\n`);

    // Step 2: Test the webhook
    console.log('2. Testing webhook...');
    const testResponse = await fetch(`${BASE_URL}/api/settings/webhooks/${webhook.id}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your authentication headers here if needed
      }
    });

    if (!testResponse.ok) {
      throw new Error(`Failed to test webhook: ${testResponse.status} ${testResponse.statusText}`);
    }

    const testResult = await testResponse.json();
    console.log(`✅ Webhook test result:`, testResult);
    console.log('');

    // Step 3: Check webhook logs
    console.log('3. Checking webhook logs...');
    const logsResponse = await fetch(`${BASE_URL}/api/settings/webhooks/${webhook.id}/logs?page=1&limit=5`);
    
    if (logsResponse.ok) {
      const logs = await logsResponse.json();
      console.log(`✅ Found ${logs.logs.length} log entries`);
      if (logs.logs.length > 0) {
        const latestLog = logs.logs[0];
        console.log(`   Latest log: ${latestLog.event_type} - ${latestLog.success ? 'Success' : 'Failed'}`);
      }
    } else {
      console.log('⚠️  Could not fetch webhook logs');
    }
    console.log('');

    // Step 4: List all webhooks
    console.log('4. Listing all webhooks...');
    const listResponse = await fetch(`${BASE_URL}/api/settings/webhooks`);
    
    if (listResponse.ok) {
      const webhooks = await listResponse.json();
      console.log(`✅ Found ${webhooks.length} webhooks`);
      webhooks.forEach(wh => {
        console.log(`   - ${wh.name} (${wh.is_active ? 'Active' : 'Inactive'}) - ${wh.events.length} events`);
      });
    } else {
      console.log('⚠️  Could not fetch webhooks list');
    }
    console.log('');

    // Step 5: Clean up (delete test webhook)
    console.log('5. Cleaning up test webhook...');
    const deleteResponse = await fetch(`${BASE_URL}/api/settings/webhooks/${webhook.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Add your authentication headers here if needed
      }
    });

    if (deleteResponse.ok) {
      console.log('✅ Test webhook deleted');
    } else {
      console.log('⚠️  Could not delete test webhook');
    }

    console.log('\n🎉 Webhook system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testWebhookSystem(); 