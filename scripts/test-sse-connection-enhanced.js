#!/usr/bin/env node

/**
 * Enhanced SSE Connection Test Script
 * This script helps diagnose SSE connection issues including chunked encoding problems
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class EnhancedSSETester {
  constructor(url, options = {}) {
    this.url = new URL(url);
    this.options = {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      keepaliveInterval: options.keepaliveInterval || 15000,
      verbose: options.verbose !== false,
      ...options
    };
    
    this.client = this.url.protocol === 'https:' ? https : http;
    this.connectionStartTime = Date.now();
    this.keepaliveCount = 0;
    this.lastKeepalive = null;
    this.errors = [];
    this.events = [];
  }

  log(message, type = 'info') {
    if (!this.options.verbose) return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testConnection() {
    console.log(`\n🔌 Enhanced SSE Connection Test`);
    console.log(`📍 Target: ${this.url.href}`);
    console.log(`⏱️  Timeout: ${this.options.timeout}ms`);
    console.log(`🔄 Retries: ${this.options.retries}`);
    console.log(`💓 Keepalive: ${this.options.keepaliveInterval}ms`);
    console.log('─'.repeat(80));

    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        this.log(`Attempt ${attempt}/${this.options.retries}`, 'info');
        const result = await this.attemptConnection(attempt);
        if (result.success) {
          return result;
        }
      } catch (error) {
        this.log(`Attempt ${attempt} failed: ${error.message}`, 'error');
        this.errors.push({ attempt, error: error.message, timestamp: new Date().toISOString() });
        
        if (attempt < this.options.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.log(`Waiting ${delay}ms before retry...`, 'info');
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      errors: this.errors,
      summary: this.generateSummary()
    };
  }

  async attemptConnection(attemptNumber) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('Connection timeout'));
      }, this.options.timeout);

      const options = {
        hostname: this.url.hostname,
        port: this.url.port || (this.url.protocol === 'https:' ? 443 : 80),
        path: this.url.pathname + this.url.search,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'User-Agent': 'Enhanced-SSE-Tester/1.0'
        },
        timeout: this.options.timeout
      };

      const req = this.client.request(options, (res) => {
        clearTimeout(timeout);
        this.analyzeResponse(res, resolve, reject);
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`Request error: ${error.message}`, 'error');
        reject(error);
      });

      req.on('timeout', () => {
        clearTimeout(timeout);
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  analyzeResponse(res, resolve, reject) {
    this.log(`📡 Response Status: ${res.statusCode} ${res.statusMessage}`, 'info');
    this.log(`📋 Response Headers:`, 'debug');
    
    Object.entries(res.headers).forEach(([key, value]) => {
      this.log(`   ${key}: ${value}`, 'debug');
    });

    // Check for potential chunked encoding issues
    const transferEncoding = res.headers['transfer-encoding'];
    const contentLength = res.headers['content-length'];
    
    if (transferEncoding && transferEncoding.includes('chunked')) {
      this.log(`⚠️  Transfer-Encoding: chunked detected - potential source of issues`, 'warning');
    }
    
    if (contentLength) {
      this.log(`📏 Content-Length: ${contentLength} bytes`, 'info');
    }

    if (res.statusCode !== 200) {
      const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
      this.log(`❌ Expected status 200, got ${res.statusCode}`, 'error');
      reject(error);
      return;
    }

    this.log(`✅ Connection established successfully`, 'success');
    this.log(`📨 Receiving SSE events...`, 'info');
    console.log('─'.repeat(80));

    let buffer = '';
    let eventCount = 0;
    let lastEventTime = Date.now();

    res.on('data', (chunk) => {
      const now = Date.now();
      const chunkSize = chunk.length;
      
      this.log(`📦 Received chunk: ${chunkSize} bytes`, 'debug');
      
      buffer += chunk.toString();
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      lines.forEach(line => {
        if (line.trim() === '') {
          // Empty line indicates end of event
          if (eventCount > 0) {
            const eventDuration = now - lastEventTime;
            this.log(`📝 Event ${eventCount} completed in ${eventDuration}ms`, 'debug');
          }
          return;
        }
        
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          eventCount++;
          lastEventTime = now;
          
          try {
            const parsed = JSON.parse(data);
            this.handleEvent(parsed, eventCount);
          } catch (error) {
            this.log(`📝 Raw data: ${data}`, 'debug');
          }
        } else if (line.startsWith('event: ')) {
          const eventType = line.substring(7);
          this.log(`🎯 Event type: ${eventType}`, 'debug');
        } else if (line.startsWith('id: ')) {
          const eventId = line.substring(4);
          this.log(`🆔 Event ID: ${eventId}`, 'debug');
        } else if (line.startsWith('retry: ')) {
          const retryMs = line.substring(7);
          this.log(`🔄 Retry delay: ${retryMs}ms`, 'debug');
        } else {
          this.log(`📄 Header: ${line}`, 'debug');
        }
      });
    });

    res.on('end', () => {
      this.log(`🏁 Connection ended normally`, 'info');
      this.log(`📊 Total events received: ${eventCount}`, 'info');
      
      resolve({
        success: true,
        eventCount,
        duration: Date.now() - this.connectionStartTime,
        summary: this.generateSummary()
      });
    });

    res.on('error', (error) => {
      this.log(`❌ Response error: ${error.message}`, 'error');
      reject(error);
    });

    // Monitor for keepalive events
    const keepaliveMonitor = setInterval(() => {
      const now = Date.now();
      const timeSinceLastEvent = now - lastEventTime;
      
      if (timeSinceLastEvent > this.options.keepaliveInterval * 2) {
        this.log(`⚠️  No events received for ${Math.round(timeSinceLastEvent / 1000)}s - potential connection issue`, 'warning');
      }
    }, 5000);

    // Cleanup on connection end
    res.on('end', () => clearInterval(keepaliveMonitor));
    res.on('error', () => clearInterval(keepaliveMonitor));
  }

  handleEvent(data, eventNumber) {
    this.events.push({
      number: eventNumber,
      type: data.type,
      timestamp: data.timestamp,
      data: data,
      receivedAt: new Date().toISOString()
    });

    if (data.type === 'keepalive') {
      this.keepaliveCount++;
      this.lastKeepalive = new Date();
      this.log(`💓 Keepalive #${this.keepaliveCount} received`, 'debug');
    } else {
      this.log(`📨 Event #${eventNumber}: ${data.type || 'unknown'}`, 'info');
    }
  }

  generateSummary() {
    const duration = Date.now() - this.connectionStartTime;
    const eventsPerSecond = this.events.length / (duration / 1000);
    
    return {
      duration: `${Math.round(duration / 1000)}s`,
      totalEvents: this.events.length,
      eventsPerSecond: eventsPerSecond.toFixed(2),
      keepaliveCount: this.keepaliveCount,
      lastKeepalive: this.lastKeepalive,
      errors: this.errors.length,
      success: this.errors.length === 0
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔌 Enhanced SSE Connection Tester

Usage: node test-sse-connection-enhanced.js <url> [options]

Options:
  --timeout <ms>        Connection timeout (default: 30000)
  --retries <count>     Number of retry attempts (default: 3)
  --keepalive <ms>      Expected keepalive interval (default: 15000)
  --quiet               Reduce output verbosity
  --help                Show this help message

Examples:
  node test-sse-connection-enhanced.js http://localhost:8021/api/sse
  node test-sse-connection-enhanced.js http://localhost:8021/api/sse --timeout 60000
  node test-sse-connection-enhanced.js http://localhost:8021/api/sse --retries 5 --keepalive 30000
`);
    process.exit(0);
  }

  const url = args[0];
  const options = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--retries' && args[i + 1]) {
      options.retries = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--keepalive' && args[i + 1]) {
      options.keepaliveInterval = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--quiet') {
      options.verbose = false;
    } else if (args[i] === '--help') {
      console.log('Use --help for usage information');
      process.exit(0);
    }
  }

  const tester = new EnhancedSSETester(url, options);
  
  tester.testConnection()
    .then(result => {
      console.log('\n📊 Test Results Summary');
      console.log('─'.repeat(80));
      
      if (result.success) {
        console.log(`✅ Connection successful!`);
        console.log(`⏱️  Duration: ${result.summary.duration}`);
        console.log(`📨 Events: ${result.summary.totalEvents}`);
        console.log(`💓 Keepalives: ${result.summary.keepaliveCount}`);
        console.log(`📈 Rate: ${result.summary.eventsPerSecond} events/sec`);
      } else {
        console.log(`❌ Connection failed after ${options.retries} attempts`);
        console.log(`🚨 Errors: ${result.summary.errors}`);
        
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. Attempt ${error.attempt}: ${error.error}`);
        });
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { EnhancedSSETester };
