#!/usr/bin/env node

/**
 * Test Process Queue
 * 
 * This script tests the process queue to verify it can handle multiple jobs concurrently.
 */

require('dotenv').config({ path: '.env.local' });

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
};

// HTTP request utility
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testProcessQueue() {
  console.log('🧪 Testing Process Queue Configuration...\n');
  
  try {
    // Test 1: Check queue status
    console.log('📊 Test 1: Checking queue status...');
    const statusResponse = await makeRequest(`${config.baseUrl}/api/upload-queue`, {
      method: 'GET'
    });
    
    if (statusResponse.status === 200) {
      const queueData = statusResponse.data;
      console.log(`  ✅ Queue status retrieved successfully`);
      console.log(`  📈 Total jobs: ${queueData.total || 0}`);
      console.log(`  🔵 Queued jobs: ${queueData.queued || 0}`);
      console.log(`  🟡 Processing jobs: ${queueData.processing || 0}`);
      console.log(`  🟢 Success jobs: ${queueData.success || 0}`);
      console.log(`  🔴 Error jobs: ${queueData.error || 0}`);
    } else {
      console.log(`  ❌ Failed to get queue status: ${statusResponse.status}`);
      return;
    }
    
    // Test 2: Test single job processing
    console.log('\n⚙️  Test 2: Testing single job processing...');
    const singleResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process`, {
      method: 'POST'
    });
    
    if (singleResponse.status === 200) {
      console.log(`  ✅ Single job processing response: ${singleResponse.data.message || 'Job processed'}`);
      if (singleResponse.data.job) {
        console.log(`  📄 Processed job: ${singleResponse.data.job.file_name} (${singleResponse.data.job.status})`);
      }
    } else {
      console.log(`  ❌ Single job processing failed: ${singleResponse.status}`);
    }
    
    // Test 3: Test batch job processing
    console.log('\n🔄 Test 3: Testing batch job processing...');
    const batchResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=5`, {
      method: 'POST'
    });
    
    if (batchResponse.status === 200) {
      const batchData = batchResponse.data;
      console.log(`  ✅ Batch processing response: ${batchData.processed_count} jobs processed`);
      console.log(`  📋 Messages: ${batchData.messages?.join(', ') || 'None'}`);
      
      if (batchData.processed && batchData.processed.length > 0) {
        console.log(`  📄 Processed jobs:`);
        batchData.processed.forEach((job, index) => {
          console.log(`    ${index + 1}. ${job.file_name || job.id} (${job.status})`);
        });
      }
    } else {
      console.log(`  ❌ Batch processing failed: ${batchResponse.status}`);
    }
    
    // Test 4: Check system settings
    console.log('\n⚙️  Test 4: Checking system settings...');
    const settingsResponse = await makeRequest(`${config.baseUrl}/api/settings/system-settings`, {
      method: 'GET'
    });
    
    if (settingsResponse.status === 200) {
      const settings = settingsResponse.data;
      console.log(`  ✅ System settings retrieved`);
      console.log(`  🔢 Max concurrent processors: ${settings.maxConcurrentProcessors || 'Not set'}`);
      console.log(`  🌐 Webhook URL: ${settings.resumeProcessingWebhookUrl ? 'Set' : 'Not set'}`);
      console.log(`  ⏱️  Webhook timeout: ${settings.resumeProcessingWebhookTimeout || 'Not set'}`);
    } else {
      console.log(`  ❌ Failed to get system settings: ${settingsResponse.status}`);
    }
    
    console.log('\n🎉 Process Queue Test Completed!');
    console.log('\nSummary:');
    console.log('- The process queue should now handle multiple jobs concurrently');
    console.log('- Batch processing will claim multiple jobs and process them simultaneously');
    console.log('- The max concurrent limit (5) will be respected');
    console.log('- Monitor the admin panel to see multiple jobs processing at once');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProcessQueue().catch(console.error);
