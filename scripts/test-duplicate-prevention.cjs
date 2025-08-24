#!/usr/bin/env node

/**
 * Test Duplicate Prevention
 * 
 * This script tests that the process queue properly prevents duplicate job processing
 * and doesn't resend the same job multiple times.
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

async function testDuplicatePrevention() {
  console.log('🧪 Testing Duplicate Prevention...\n');
  
  try {
    // Test 1: Check current queue status
    console.log('📊 Test 1: Checking current queue status...');
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
    } else {
      console.log(`  ❌ Failed to get queue status: ${queueResponse.status}`);
      return;
    }
    
    // Test 2: First batch processing
    console.log('\n🔄 Test 2: First batch processing...');
    const firstBatchResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=100`, {
      method: 'POST'
    });
    
    if (firstBatchResponse.status === 200) {
      const firstBatchData = firstBatchResponse.data;
      console.log(`  ✅ First batch completed`);
      console.log(`  📊 Jobs processed: ${firstBatchData.processed_count || 0}`);
      console.log(`  📋 Messages: ${firstBatchData.messages?.join(', ') || 'None'}`);
      
      if (firstBatchData.processed && firstBatchData.processed.length > 0) {
        console.log(`  📄 First batch processed jobs:`);
        firstBatchData.processed.forEach((job, index) => {
          const status = job.status === 'success' ? '✅' : job.status === 'fail' ? '❌' : job.status === 'skipped' ? '⏭️' : '⚠️';
          console.log(`    ${index + 1}. ${status} ${job.file_name || job.id} (${job.status})`);
        });
      }
    } else {
      console.log(`  ❌ First batch failed: ${firstBatchResponse.status}`);
      return;
    }
    
    // Test 3: Immediate second batch processing (should prevent duplicates)
    console.log('\n🔄 Test 3: Immediate second batch processing (duplicate prevention test)...');
    const secondBatchResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=100`, {
      method: 'POST'
    });
    
    if (secondBatchResponse.status === 200) {
      const secondBatchData = secondBatchResponse.data;
      console.log(`  ✅ Second batch completed`);
      console.log(`  📊 Jobs processed: ${secondBatchData.processed_count || 0}`);
      console.log(`  📋 Messages: ${secondBatchData.messages?.join(', ') || 'None'}`);
      
      if (secondBatchData.processed && secondBatchData.processed.length > 0) {
        console.log(`  📄 Second batch processed jobs:`);
        secondBatchData.processed.forEach((job, index) => {
          const status = job.status === 'success' ? '✅' : job.status === 'fail' ? '❌' : job.status === 'skipped' ? '⏭️' : '⚠️';
          console.log(`    ${index + 1}. ${status} ${job.file_name || job.id} (${job.status})`);
        });
        
        // Check for skipped jobs (good - indicates duplicate prevention working)
        const skippedJobs = secondBatchData.processed.filter(job => job.status === 'skipped');
        if (skippedJobs.length > 0) {
          console.log(`  🎉 SUCCESS: ${skippedJobs.length} jobs were skipped (duplicate prevention working)`);
        } else {
          console.log(`  ℹ️  No jobs were skipped in second batch`);
        }
      } else {
        console.log(`  ℹ️  No jobs processed in second batch (expected if first batch processed all available jobs)`);
      }
    } else {
      console.log(`  ❌ Second batch failed: ${secondBatchResponse.status}`);
    }
    
    // Test 4: Check final queue status
    console.log('\n📈 Test 4: Checking final queue status...');
    const finalQueueResponse = await makeRequest(`${config.baseUrl}/api/upload-queue`, {
      method: 'GET'
    });
    
    if (finalQueueResponse.status === 200) {
      const finalQueueData = finalQueueResponse.data;
      console.log(`  ✅ Final queue status retrieved`);
      console.log(`  📊 Total jobs: ${finalQueueData.total || 0}`);
      console.log(`  🔵 Queued jobs: ${finalQueueData.queued || 0}`);
      console.log(`  🟡 Processing jobs: ${finalQueueData.processing || 0}`);
      console.log(`  🟢 Success jobs: ${finalQueueData.success || 0}`);
      console.log(`  🔴 Error jobs: ${finalQueueData.error || 0}`);
      
      // Check if processing jobs are within limits
      if (finalQueueData.processing > 0) {
        console.log(`  ⚠️  Warning: ${finalQueueData.processing} jobs still processing`);
        console.log(`  💡 This is normal if jobs are still being processed`);
      }
    }
    
    // Test 5: Multiple rapid calls test
    console.log('\n⚡ Test 5: Multiple rapid calls test...');
    const rapidCalls = [];
    for (let i = 0; i < 3; i++) {
      rapidCalls.push(
        makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=10`, {
          method: 'POST'
        })
      );
    }
    
    const rapidResults = await Promise.all(rapidCalls);
    let totalProcessed = 0;
    let totalSkipped = 0;
    
    rapidResults.forEach((result, index) => {
      if (result.status === 200) {
        const data = result.data;
        const processed = data.processed_count || 0;
        const skipped = data.processed?.filter(job => job.status === 'skipped').length || 0;
        
        console.log(`  📊 Call ${index + 1}: ${processed} processed, ${skipped} skipped`);
        totalProcessed += processed;
        totalSkipped += skipped;
      } else {
        console.log(`  ❌ Call ${index + 1} failed: ${result.status}`);
      }
    });
    
    console.log(`  📈 Total across rapid calls: ${totalProcessed} processed, ${totalSkipped} skipped`);
    
    if (totalSkipped > 0) {
      console.log(`  🎉 SUCCESS: Duplicate prevention working (${totalSkipped} jobs skipped)`);
    } else {
      console.log(`  ℹ️  No duplicates detected in rapid calls`);
    }
    
    console.log('\n🎉 Duplicate Prevention Test Completed!');
    console.log('\n📋 Summary:');
    console.log('- The process queue should prevent duplicate job processing');
    console.log('- Jobs should not be sent to webhook multiple times');
    console.log('- Skipped jobs indicate duplicate prevention is working');
    console.log('- Concurrent processing should respect job status and flags');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDuplicatePrevention().catch(console.error);
