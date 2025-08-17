#!/usr/bin/env node

/**
 * Trigger Process Queue Script
 * 
 * This script manually triggers the upload queue processing
 * to help resolve stuck jobs.
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

async function triggerProcessQueue() {
  try {
    console.log('🚀 Trigger Process Queue');
    console.log('========================\n');

    console.log('📊 Checking current queue status...');
    const queueResponse = await makeRequest(`${config.baseUrl}/api/upload-queue`);
    
    if (queueResponse.status !== 200) {
      console.error('❌ Failed to fetch queue status:', queueResponse.data);
      return;
    }

    const queueData = queueResponse.data;
    console.log('Current queue status:', queueData);

    // Check if there are queued jobs
    const queuedJobs = queueData.data?.filter(job => job.status === 'queued') || [];
    const inProcessJobs = queueData.data?.filter(job => job.status === 'inprocess') || [];

    console.log(`📋 Found ${queuedJobs.length} queued jobs and ${inProcessJobs.length} in-process jobs`);

    if (queuedJobs.length === 0) {
      console.log('✅ No queued jobs to process');
      return;
    }

    console.log('\n🔄 Triggering queue processing...');
    const processResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process`, {
      method: 'POST'
    });

    console.log('Process response:', processResponse);

    if (processResponse.status === 200) {
      console.log('✅ Queue processing triggered successfully');
      console.log('Response:', processResponse.data);
    } else {
      console.log('❌ Failed to trigger queue processing:', processResponse.data);
    }

    // Wait a moment and check the queue again
    console.log('\n⏳ Waiting 5 seconds and checking queue again...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const queueResponse2 = await makeRequest(`${config.baseUrl}/api/upload-queue`);
    if (queueResponse2.status === 200) {
      const queueData2 = queueResponse2.data;
      const queuedJobs2 = queueData2.data?.filter(job => job.status === 'queued') || [];
      const inProcessJobs2 = queueData2.data?.filter(job => job.status === 'inprocess') || [];
      
      console.log(`📊 Updated status: ${queuedJobs2.length} queued jobs and ${inProcessJobs2.length} in-process jobs`);
    }

  } catch (error) {
    console.error('❌ Failed to trigger process queue:', error.message);
  }
}

// Run the script
triggerProcessQueue().catch(console.error);
