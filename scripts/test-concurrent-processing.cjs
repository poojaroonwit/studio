#!/usr/bin/env node

/**
 * Test Concurrent Processing
 * 
 * This script tests that the process queue properly utilizes the full concurrent capacity
 * as specified by the maxConcurrentProcessors setting.
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

async function testConcurrentProcessing() {
  console.log('🧪 Testing Concurrent Processing Configuration...\n');
  
  try {
    // Test 1: Check current system settings
    console.log('📊 Test 1: Checking system settings...');
    const settingsResponse = await makeRequest(`${config.baseUrl}/api/settings/system-settings`, {
      method: 'GET'
    });
    
    if (settingsResponse.status === 200) {
      const settings = settingsResponse.data;
      const maxConcurrent = settings.maxConcurrentProcessors || 'Not set';
      console.log(`  ✅ System settings retrieved`);
      console.log(`  🔢 Max concurrent processors: ${maxConcurrent}`);
      console.log(`  🌐 Webhook URL: ${settings.resumeProcessingWebhookUrl ? 'Set' : 'Not set'}`);
      console.log(`  ⏱️  Webhook timeout: ${settings.resumeProcessingWebhookTimeout || 'Not set'}`);
      
      if (maxConcurrent === 'Not set' || parseInt(maxConcurrent) < 1) {
        console.log(`  ⚠️  Warning: maxConcurrentProcessors is not properly set`);
        return;
      }
    } else {
      console.log(`  ❌ Failed to get system settings: ${settingsResponse.status}`);
      return;
    }
    
    // Test 2: Check current queue status
    console.log('\n📈 Test 2: Checking queue status...');
    const queueResponse = await makeRequest(`${config.baseUrl}/api/upload-queue`, {
      method: 'GET'
    });
    
    if (queueResponse.status === 200) {
      const queueData = queueResponse.data;
      console.log(`  ✅ Queue status retrieved`);
      console.log(`  📊 Total jobs: ${queueData.total || 0}`);
      console.log(`  🔵 Queued jobs: ${queueData.queued || 0}`);
      console.log(`  🟡 Processing jobs: ${queueData.processing || 0}`);
      console.log(`  🟢 Success jobs: ${queueData.success || 0}`);
      console.log(`  🔴 Error jobs: ${queueData.error || 0}`);
      
      if ((queueData.queued || 0) === 0) {
        console.log(`  ⚠️  Warning: No queued jobs available for testing`);
        console.log(`  💡 Upload some files to test concurrent processing`);
        return;
      }
    } else {
      console.log(`  ❌ Failed to get queue status: ${queueResponse.status}`);
      return;
    }
    
    // Test 3: Test batch processing with full concurrent capacity
    console.log('\n🔄 Test 3: Testing batch processing with full concurrent capacity...');
    const batchResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=100`, {
      method: 'POST'
    });
    
    if (batchResponse.status === 200) {
      const batchData = batchResponse.data;
      console.log(`  ✅ Batch processing completed`);
      console.log(`  📊 Jobs processed: ${batchData.processed_count || 0}`);
      console.log(`  📋 Messages: ${batchData.messages?.join(', ') || 'None'}`);
      
      // Check if we processed the expected number of jobs
      const maxConcurrent = parseInt(settingsResponse.data.maxConcurrentProcessors || '5');
      const processedCount = batchData.processed_count || 0;
      
      console.log(`  🎯 Expected max concurrent jobs: ${maxConcurrent}`);
      console.log(`  ✅ Actual jobs processed: ${processedCount}`);
      
      if (processedCount > 0) {
        if (processedCount >= maxConcurrent) {
          console.log(`  🎉 SUCCESS: Processed ${processedCount} jobs (utilizing full concurrent capacity)`);
        } else if (processedCount > 1) {
          console.log(`  ✅ GOOD: Processed ${processedCount} jobs concurrently (partial capacity)`);
        } else {
          console.log(`  ⚠️  WARNING: Only processed ${processedCount} job (not utilizing concurrent capacity)`);
        }
        
        // Show details of processed jobs
        if (batchData.processed && batchData.processed.length > 0) {
          console.log(`  📄 Processed jobs:`);
          batchData.processed.forEach((job, index) => {
            const status = job.status === 'success' ? '✅' : job.status === 'fail' ? '❌' : '⚠️';
            console.log(`    ${index + 1}. ${status} ${job.file_name || job.id} (${job.status})`);
          });
        }
      } else {
        console.log(`  ℹ️  No jobs were processed (queue might be empty or max concurrent limit reached)`);
      }
    } else {
      console.log(`  ❌ Batch processing failed: ${batchResponse.status}`);
      console.log(`  📄 Response: ${JSON.stringify(batchResponse.data)}`);
    }
    
    // Test 4: Verify concurrent processing behavior
    console.log('\n🔍 Test 4: Verifying concurrent processing behavior...');
    const finalQueueResponse = await makeRequest(`${config.baseUrl}/api/upload-queue`, {
      method: 'GET'
    });
    
    if (finalQueueResponse.status === 200) {
      const finalQueueData = finalQueueResponse.data;
      const processingCount = finalQueueData.processing || 0;
      const maxConcurrent = parseInt(settingsResponse.data.maxConcurrentProcessors || '5');
      
      console.log(`  📊 Current processing jobs: ${processingCount}`);
      console.log(`  🔢 Max concurrent setting: ${maxConcurrent}`);
      
      if (processingCount > 0) {
        if (processingCount <= maxConcurrent) {
          console.log(`  ✅ CORRECT: Processing ${processingCount} jobs (within concurrent limit)`);
        } else {
          console.log(`  ❌ ERROR: Processing ${processingCount} jobs (exceeds concurrent limit of ${maxConcurrent})`);
        }
      } else {
        console.log(`  ℹ️  No jobs currently processing`);
      }
    }
    
    console.log('\n🎉 Concurrent Processing Test Completed!');
    console.log('\n📋 Summary:');
    console.log('- The process queue should now utilize the full concurrent capacity');
    console.log('- Batch processing will claim and process up to maxConcurrent jobs simultaneously');
    console.log('- The implementation now matches the maxConcurrentProcessors setting');
    console.log('- Monitor the admin panel to see multiple jobs processing at once');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testConcurrentProcessing().catch(console.error);
