#!/usr/bin/env node

/**
 * Reset Stuck Jobs via API Script
 * 
 * This script resets jobs that are stuck in 'inprocess' status
 * by calling the API endpoint directly.
 */

const https = require('https');
const http = require('http');

// Configuration - update these values for your environment
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'local-dev-api-key',
};

async function makeRequest(url, options = {}) {
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
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
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

async function resetStuckJobs() {
  try {
    console.log('🔄 Reset Stuck Jobs via API');
    console.log('============================\n');

    // First, let's check the current queue status
    console.log('📊 Checking current queue status...');
    const queueResponse = await makeRequest(`${config.baseUrl}/api/upload-queue`);
    
    if (queueResponse.status !== 200) {
      console.error('❌ Failed to fetch queue status:', queueResponse.data);
      return;
    }

    const queueData = queueResponse.data;
    console.log('Current queue status:', queueData);

    // Check if there are stuck jobs (inprocess for more than 1 hour)
    const stuckJobs = queueData.data?.filter(job => 
      job.status === 'inprocess' && 
      job.process_date && 
      (Date.now() - new Date(job.process_date).getTime()) > 3600000 // 1 hour in ms
    ) || [];

    if (stuckJobs.length === 0) {
      console.log('✅ No stuck jobs found to reset');
      return;
    }

    console.log(`Found ${stuckJobs.length} stuck jobs:`);
    stuckJobs.forEach(job => {
      const stuckTime = Math.round((Date.now() - new Date(job.process_date).getTime()) / 3600000);
      console.log(`  - ${job.file_name} (stuck for ${stuckTime} hours)`);
    });
    console.log('');

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Do you want to reset these jobs to "queued" status? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      return;
    }

    // Reset each stuck job by updating its status
    console.log('🔄 Resetting stuck jobs...');
    
    for (const job of stuckJobs) {
      try {
        const resetResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/${job.id}`, {
          method: 'PATCH',
          body: {
            status: 'queued',
            process_date: null,
            error: 'Reset due to timeout - will retry',
            error_details: 'Job was stuck in processing and has been reset for retry'
          }
        });

        if (resetResponse.status === 200) {
          console.log(`✅ Reset job: ${job.file_name}`);
        } else {
          console.log(`❌ Failed to reset job ${job.file_name}:`, resetResponse.data);
        }
      } catch (error) {
        console.log(`❌ Error resetting job ${job.file_name}:`, error.message);
      }
    }

    console.log('\n🔄 Jobs have been reset and are now back in the queue.');
    console.log('💡 Try processing the queue again to see if it works.');

  } catch (error) {
    console.error('❌ Failed to reset stuck jobs:', error.message);
  }
}

// Run the script
resetStuckJobs().catch(console.error);
