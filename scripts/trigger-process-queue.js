#!/usr/bin/env node

/**
 * Trigger Process Queue Script
 * 
 * This script manually triggers the upload queue processing
 * to help resolve stuck jobs.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

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

    console.log('🔄 Triggering queue processing...');
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

    // Also try batch processing
    console.log('\n🔄 Triggering batch queue processing...');
    const batchResponse = await makeRequest(`${config.baseUrl}/api/upload-queue/process-all`, {
      method: 'POST'
    });

    console.log('Batch process response:', batchResponse);

    if (batchResponse.status === 200) {
      console.log('✅ Batch queue processing triggered successfully');
      console.log('Response:', batchResponse.data);
    } else {
      console.log('❌ Failed to trigger batch queue processing:', batchResponse.data);
    }

  } catch (error) {
    console.error('❌ Failed to trigger process queue:', error.message);
  }
}

// Run the script
triggerProcessQueue().catch(console.error);
