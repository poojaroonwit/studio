#!/usr/bin/env node

/**
 * SSE Connection Test Script
 * 
 * This script tests SSE connections to help debug connection issues.
 * Usage: node scripts/test-sse-connection.js [url]
 * 
 * Examples:
 * - node scripts/test-sse-connection.js http://localhost:3000/api/sse
 * - node scripts/test-sse-connection.js https://dev-ncc-cv-screening.qsncc.com/api/sse
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class SSETester {
  constructor(url) {
    this.url = new URL(url);
    this.isHttps = this.url.protocol === 'https:';
    this.client = this.isHttps ? https : http;
    this.connectionStartTime = Date.now();
    this.eventCount = 0;
    this.keepaliveCount = 0;
    this.lastEventTime = null;
  }

  async testConnection() {
    console.log(`\n🔌 Testing SSE connection to: ${this.url.href}`);
    console.log(`📅 Test started at: ${new Date().toISOString()}`);
    console.log(`🔒 Protocol: ${this.url.protocol}`);
    console.log(`🌐 Host: ${this.url.host}`);
    console.log(`📍 Path: ${this.url.pathname}`);
    console.log('─'.repeat(60));

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.url.hostname,
        port: this.url.port || (this.isHttps ? 443 : 80),
        path: this.url.pathname + this.url.search,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'User-Agent': 'SSE-Test-Script/1.0'
        }
      };

      const req = this.client.request(options, (res) => {
        console.log(`📡 Response Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📋 Response Headers:`);
        
        Object.entries(res.headers).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });

        if (res.statusCode !== 200) {
          console.log(`❌ Expected status 200, got ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        console.log('\n📨 Receiving SSE events...');
        console.log('─'.repeat(60));

        let buffer = '';
        let lineCount = 0;

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          lines.forEach(line => {
            lineCount++;
            if (line.trim() === '') {
              // Empty line indicates end of event
              return;
            }
            
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              try {
                const parsed = JSON.parse(data);
                this.handleEvent(parsed);
              } catch (error) {
                console.log(`📝 Raw data: ${data}`);
              }
            } else if (line.startsWith('event: ')) {
              const eventType = line.substring(7);
              console.log(`🎯 Event type: ${eventType}`);
            } else if (line.startsWith('id: ')) {
              const eventId = line.substring(4);
              console.log(`🆔 Event ID: ${eventId}`);
            } else if (line.startsWith('retry: ')) {
              const retryMs = line.substring(7);
              console.log(`🔄 Retry delay: ${retryMs}ms`);
            } else {
              console.log(`📄 Header: ${line}`);
            }
          });
        });

        res.on('end', () => {
          console.log('\n─'.repeat(60));
          console.log(`✅ Connection ended normally`);
          console.log(`📊 Test Summary:`);
          console.log(`   • Total events received: ${this.eventCount}`);
          console.log(`   • Keepalive events: ${this.keepaliveCount}`);
          console.log(`   • Connection duration: ${Date.now() - this.connectionStartTime}ms`);
          if (this.lastEventTime) {
            console.log(`   • Last event: ${this.lastEventTime}`);
          }
          console.log(`\n🎉 SSE connection test completed successfully!`);
          resolve();
        });

        res.on('error', (error) => {
          console.error(`❌ Response error:`, error.message);
          reject(error);
        });
      });

      req.on('error', (error) => {
        console.error(`❌ Request error:`, error.message);
        reject(error);
      });

      req.on('timeout', () => {
        console.error(`⏰ Request timeout`);
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Set timeout to 30 seconds
      req.setTimeout(30000);

      req.end();
    });
  }

  handleEvent(data) {
    this.eventCount++;
    this.lastEventTime = new Date().toISOString();
    
    if (data.type === 'keepalive') {
      this.keepaliveCount++;
      console.log(`💓 Keepalive #${this.keepaliveCount} - Uptime: ${data.uptime}ms`);
    } else if (data.type === 'connected') {
      console.log(`🔗 Connected: ${data.message}`);
      console.log(`   User ID: ${data.userId}`);
      console.log(`   Connection ID: ${data.connectionId}`);
      console.log(`   Features: ${data.features?.join(', ')}`);
    } else if (data.type === 'test_event') {
      console.log(`🧪 Test Event #${data.eventNumber}: ${data.message}`);
    } else if (data.type === 'test_complete') {
      console.log(`✅ Test Complete: ${data.message}`);
      console.log(`   Total Events: ${data.totalEvents}`);
    } else {
      console.log(`📨 Event [${data.type || 'unknown'}]:`, data.message || data);
    }
  }
}

async function main() {
  const url = process.argv[2] || 'http://localhost:3000/api/sse';
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error('❌ Error: URL must start with http:// or https://');
    console.error(`Usage: node scripts/test-sse-connection.js [url]`);
    console.error(`Example: node scripts/test-sse-connection.js https://dev-ncc-cv-screening.qsncc.com/api/sse`);
    process.exit(1);
  }

  const tester = new SSETester(url);
  
  try {
    await tester.testConnection();
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   • Check if the server is running');
      console.error('   • Verify the port number is correct');
      console.error('   • Ensure the server is accessible from this machine');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   • Check if the hostname is correct');
      console.error('   • Verify DNS resolution');
      console.error('   • Check network connectivity');
    } else if (error.message.includes('401')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   • This endpoint requires authentication');
      console.error('   • You need to be logged in to access it');
      console.error('   • Try accessing it through a browser first');
    } else if (error.message.includes('404')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   • Check if the API route exists');
      console.error('   • Verify the URL path is correct');
      console.error('   • Ensure the server is running the correct version');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SSETester;
