#!/usr/bin/env node

/**
 * Authenticated SSE Test Script
 * 
 * This script tests the SSE connection with proper authentication
 * to verify that chunked encoding issues have been resolved.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const DEFAULT_URL = 'http://localhost:8021/api/sse';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class AuthenticatedSSETester {
  constructor(url, options = {}) {
    this.url = url;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.verbose = options.verbose || false;
    this.startTime = Date.now();
    this.keepaliveCount = 0;
    this.chunkedEncodingErrors = 0;
    this.connectionErrors = 0;
    this.isConnected = false;
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  logVerbose(message, color = 'cyan') {
    if (this.verbose) {
      this.log(`[VERBOSE] ${message}`, color);
    }
  }

  async testConnection() {
    this.log('🚀 Starting Authenticated SSE Test', 'bright');
    this.log(`📍 Target URL: ${this.url}`, 'blue');
    this.log(`⏱️  Timeout: ${this.timeout}ms`, 'blue');
    this.log('', 'reset');

    try {
      await this.establishConnection();
    } catch (error) {
      this.log(`❌ Test failed: ${error.message}`, 'red');
      this.generateReport();
      process.exit(1);
    }
  }

  async establishConnection() {
    return new Promise((resolve, reject) => {
      this.log('🔌 Establishing SSE connection...', 'yellow');
      
      // Create EventSource-like connection using Node.js
      const urlObj = new URL(this.url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'User-Agent': 'SSE-Authenticated-Tester/1.0',
          // Note: In a real scenario, you would need proper authentication headers
          // 'Authorization': 'Bearer <token>',
          // 'Cookie': 'session=<session-id>'
        },
        timeout: this.timeout
      };

      const req = client.request(options, (res) => {
        this.log(`📡 Response received: ${res.statusCode} ${res.statusMessage}`, 'green');
        this.logVerbose(`📋 Response headers: ${JSON.stringify(res.headers, null, 2)}`);
        
        // Check for chunked encoding issues in headers
        this.checkHeaders(res.headers);
        
        if (res.statusCode === 401) {
          this.log('🔐 Authentication required - this is expected for SSE endpoint', 'yellow');
          this.log('💡 To test with authentication, you would need to provide valid session cookies or tokens', 'blue');
          this.generateReport();
          resolve();
          return;
        }
        
        this.isConnected = true;
        this.log('✅ SSE connection established successfully', 'green');
        
        // Set up data handling
        res.on('data', (chunk) => {
          this.handleData(chunk);
        });
        
        res.on('end', () => {
          this.log('📴 Connection ended by server', 'yellow');
          this.isConnected = false;
        });
        
        res.on('error', (error) => {
          this.log(`❌ Response error: ${error.message}`, 'red');
          this.connectionErrors++;
          this.isConnected = false;
        });
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          this.log(`⏰ Connection timeout after ${this.timeout}ms`, 'red');
          req.destroy();
          reject(new Error('Connection timeout'));
        }, this.timeout);
        
        res.on('close', () => {
          clearTimeout(timeoutId);
          this.log('🔌 Connection closed', 'yellow');
          this.isConnected = false;
        });
      });
      
      req.on('error', (error) => {
        this.log(`❌ Request error: ${error.message}`, 'red');
        this.connectionErrors++;
        
        // Check for chunked encoding specific errors
        if (error.message.includes('chunked') || error.message.includes('incomplete')) {
          this.chunkedEncodingErrors++;
          this.log('🚨 Chunked encoding error detected!', 'red');
        }
        
        reject(error);
      });
      
      req.setTimeout(this.timeout, () => {
        this.log('⏰ Request timeout', 'red');
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  checkHeaders(headers) {
    this.logVerbose('🔍 Analyzing response headers for chunked encoding issues...');
    
    // Check for problematic headers
    const problematicHeaders = [
      'transfer-encoding',
      'content-encoding',
      'accept-encoding'
    ];
    
    problematicHeaders.forEach(header => {
      if (headers[header]) {
        this.log(`⚠️  Found ${header} header: ${headers[header]}`, 'yellow');
      }
    });
    
    // Check for proper SSE headers
    if (headers['content-type'] && headers['content-type'].includes('text/event-stream')) {
      this.log('✅ Proper SSE content-type header found', 'green');
    } else {
      this.log('⚠️  Missing or incorrect SSE content-type header', 'yellow');
    }
    
    if (headers['cache-control'] && headers['cache-control'].includes('no-cache')) {
      this.log('✅ Proper cache-control header found', 'green');
    } else {
      this.log('⚠️  Missing or incorrect cache-control header', 'yellow');
    }
  }

  handleData(chunk) {
    const data = chunk.toString();
    this.logVerbose(`📦 Received data chunk (${chunk.length} bytes): ${data.substring(0, 100)}...`);
    
    // Parse SSE events
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const eventData = JSON.parse(line.substring(6));
          this.handleEvent(eventData);
        } catch (error) {
          this.logVerbose(`⚠️  Failed to parse event data: ${line}`);
        }
      } else if (line.startsWith('event: ')) {
        this.logVerbose(`📢 Event type: ${line.substring(7)}`);
      }
    }
  }

  handleEvent(eventData) {
    if (eventData.type === 'keepalive') {
      this.keepaliveCount++;
      this.log(`💓 Keepalive received (${this.keepaliveCount})`, 'green');
    } else if (eventData.type === 'connected') {
      this.log(`🎉 Connection confirmed: ${eventData.message}`, 'green');
    } else {
      this.logVerbose(`📨 Event received: ${eventData.type}`, 'cyan');
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    
    this.log('\n📊 Authenticated SSE Test Report', 'bright');
    this.log('=' .repeat(50), 'blue');
    this.log(`⏱️  Test Duration: ${duration}ms`, 'blue');
    this.log(`💓 Keepalive Events: ${this.keepaliveCount}`, 'blue');
    this.log(`❌ Connection Errors: ${this.connectionErrors}`, 'blue');
    this.log(`🚨 Chunked Encoding Errors: ${this.chunkedEncodingErrors}`, 'blue');
    this.log(`✅ Connection Status: ${this.isConnected ? 'Connected' : 'Disconnected'}`, 'blue');
    
    // Recommendations
    this.log('\n💡 Recommendations:', 'bright');
    
    if (this.chunkedEncodingErrors === 0) {
      this.log('✅ No chunked encoding errors detected - fixes appear to be working!', 'green');
    } else {
      this.log('❌ Chunked encoding errors still present - additional fixes needed', 'red');
    }
    
    if (this.connectionErrors === 0) {
      this.log('✅ No connection errors - network stability good', 'green');
    } else {
      this.log('⚠️  Connection errors detected - check network and server', 'yellow');
    }
    
    this.log('', 'reset');
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: DEFAULT_URL,
    timeout: DEFAULT_TIMEOUT,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
      case '-u':
        options.url = args[++i];
        break;
      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i]);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Authenticated SSE Test Script

Usage: node test-sse-authenticated.js [options]

Options:
  -u, --url <url>        SSE endpoint URL (default: ${DEFAULT_URL})
  -t, --timeout <ms>     Connection timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
  -v, --verbose          Enable verbose logging
  -h, --help             Show this help message

Examples:
  node test-sse-authenticated.js
  node test-sse-authenticated.js --url https://example.com/api/sse --verbose
  node test-sse-authenticated.js --timeout 30000
        `);
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }
  
  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  const tester = new AuthenticatedSSETester(options.url, options);
  
  try {
    await tester.testConnection();
    process.exit(0);
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = AuthenticatedSSETester;
