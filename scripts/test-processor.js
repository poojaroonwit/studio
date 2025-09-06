#!/usr/bin/env node

/**
 * Test Upload Queue Processor
 * 
 * This script tests the upload queue processor to ensure it's working correctly
 * after the fixes for the stuck queue issue.
 */

require('dotenv').config({ path: '.env.local' });

const http = require('http');

const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
};

// Override baseUrl for local development if it's set to Docker service name
if (config.baseUrl.includes('8021_fitscan_app:8021') || config.baseUrl.includes('172.21.0.2:8021')) {
  if (process.env.DOCKER_ENV || process.env.NODE_ENV === 'production') {
    // Keep Docker service name in production
  } else {
    config.baseUrl = 'http://localhost:8021';
  }
}

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? require('https') : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        ...options.headers
      },
      timeout: 30000, // 30 second timeout
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
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testProcessor() {
  console.log('🧪 Testing Upload Queue Processor...');
  console.log(`📡 Testing against: ${config.baseUrl}`);
  
  try {
    // Test 1: Check queue health
    console.log('\n1️⃣ Testing queue health endpoint...');
    const healthResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/health`, {
      method: 'GET'
    });
    
    if (healthResponse.status === 200) {
      console.log('✅ Queue health endpoint working');
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Queue stats:`, healthResponse.data.queue_stats);
      if (healthResponse.data.stuck_jobs.length > 0) {
        console.log(`   ⚠️  ${healthResponse.data.stuck_jobs.length} stuck jobs found`);
      }
    } else {
      console.log(`❌ Queue health endpoint failed: ${healthResponse.status}`);
    }
    
    // Test 2: Test single job processing
    console.log('\n2️⃣ Testing single job processing...');
    const processResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process`, {
      method: 'POST'
    });
    
    if (processResponse.status === 200) {
      console.log('✅ Single job processing endpoint working');
      console.log(`   Response: ${processResponse.data.message}`);
      if (processResponse.data.failed_jobs_count) {
        console.log(`   Failed jobs: ${processResponse.data.failed_jobs_count}`);
      }
    } else {
      console.log(`❌ Single job processing failed: ${processResponse.status}`);
      console.log(`   Error: ${JSON.stringify(processResponse.data)}`);
    }
    
    // Test 3: Test batch processing
    console.log('\n3️⃣ Testing batch processing...');
    const batchResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all?limit=1`, {
      method: 'POST'
    });
    
    if (batchResponse.status === 200) {
      console.log('✅ Batch processing endpoint working');
      console.log(`   Processed: ${batchResponse.data.processed_count || 0} jobs`);
    } else {
      console.log(`❌ Batch processing failed: ${batchResponse.status}`);
      console.log(`   Error: ${JSON.stringify(batchResponse.data)}`);
    }
    
    console.log('\n🎉 Processor test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testProcessor();
