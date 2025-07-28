#!/usr/bin/env node

const https = require('https');
const http = require('http');

function testWebhookUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    console.log(`Testing webhook URL: ${url}`);
    
    const req = protocol.request(url, {
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      resolve({ status: res.statusCode, headers: res.headers });
    });

    req.on('error', (error) => {
      console.log(`Error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.log('Timeout after 5 seconds');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function main() {
  const urls = [
    'http://n8n:8921/webhook/exe-process',
    'http://localhost:8921/webhook/exe-process',
    'http://127.0.0.1:8921/webhook/exe-process'
  ];

  for (const url of urls) {
    try {
      console.log(`\n--- Testing ${url} ---`);
      await testWebhookUrl(url);
    } catch (error) {
      console.log(`Failed: ${error.message}`);
    }
  }
}

main(); 