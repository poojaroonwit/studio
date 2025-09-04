#!/usr/bin/env node

/**
 * SSE Connection Diagnostic Script
 * 
 * This script helps diagnose and fix SSE connection issues by:
 * 1. Testing authentication
 * 2. Checking SSE endpoint accessibility
 * 3. Validating environment configuration
 * 4. Providing specific recommendations
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const config = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  timeout: 10000,
  debugMode: process.env.NEXT_PUBLIC_SSE_DEBUG === '1'
};

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
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
        'User-Agent': 'SSE-Diagnostic-Script/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: error.message
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
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testSSEEndpoint() {
  log('\n🔍 Testing SSE Endpoint Accessibility...', 'cyan');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/sse/test-connection`);
    
    if (response.statusCode === 200) {
      log('✅ SSE test endpoint is accessible', 'green');
      log(`   User: ${response.data.user?.email || 'Unknown'}`, 'blue');
      log(`   SSE URL: ${response.data.sseEndpoint}`, 'blue');
      
      if (response.data.recommendations) {
        log('   Recommendations:', 'yellow');
        response.data.recommendations.forEach(rec => {
          log(`   - ${rec}`, 'yellow');
        });
      }
      
      return true;
    } else if (response.statusCode === 401) {
      log('❌ Authentication failed', 'red');
      log(`   Error: ${response.data.error || 'Unknown error'}`, 'red');
      log(`   Message: ${response.data.message || 'No message'}`, 'red');
      return false;
    } else {
      log(`❌ Unexpected response: ${response.statusCode}`, 'red');
      log(`   Response: ${response.rawData}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Failed to connect to SSE endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function testSSEDebugEndpoint() {
  log('\n🔍 Testing SSE Debug Endpoint...', 'cyan');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/debug/sse`);
    
    if (response.statusCode === 200) {
      log('✅ SSE debug endpoint is accessible', 'green');
      
      if (response.data.environment) {
        log('   Environment:', 'blue');
        Object.entries(response.data.environment).forEach(([key, value]) => {
          log(`   - ${key}: ${value}`, 'blue');
        });
      }
      
      if (response.data.recommendations) {
        log('   Recommendations:', 'yellow');
        response.data.recommendations.forEach(rec => {
          log(`   - ${rec}`, 'yellow');
        });
      }
      
      return true;
    } else {
      log(`❌ Debug endpoint failed: ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Failed to connect to debug endpoint: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvironmentVariables() {
  log('\n🔍 Checking Environment Variables...', 'cyan');
  
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL'
  ];
  
  const optionalVars = [
    'NEXT_PUBLIC_SSE_DEBUG',
    'SSE_CONNECTION_TIMEOUT',
    'SSE_RETRY_DELAY'
  ];
  
  let allRequired = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName} is set`, 'green');
    } else {
      log(`❌ ${varName} is missing`, 'red');
      allRequired = false;
    }
  });
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName} is set: ${process.env[varName]}`, 'green');
    } else {
      log(`⚠️  ${varName} is not set (optional)`, 'yellow');
    }
  });
  
  return allRequired;
}

function provideRecommendations() {
  log('\n💡 Recommendations to Fix SSE Issues:', 'magenta');
  
  log('1. Enable SSE Debug Mode:', 'yellow');
  log('   Add to your .env.local file:', 'blue');
  log('   NEXT_PUBLIC_SSE_DEBUG=1', 'blue');
  
  log('\n2. Check Authentication:', 'yellow');
  log('   - Ensure you are logged in to the application', 'blue');
  log('   - Check browser cookies for session data', 'blue');
  log('   - Verify NEXTAUTH_SECRET is set correctly', 'blue');
  
  log('\n3. Test SSE Connection Manually:', 'yellow');
  log('   - Open browser developer tools', 'blue');
  log('   - Go to Network tab', 'blue');
  log('   - Try to access the application', 'blue');
  log('   - Look for failed requests to /api/sse', 'blue');
  
  log('\n4. Check Server Logs:', 'yellow');
  log('   - Look for authentication errors', 'blue');
  log('   - Check for database connection issues', 'blue');
  log('   - Verify SSE endpoint is responding', 'blue');
  
  log('\n5. Browser Compatibility:', 'yellow');
  log('   - Ensure browser supports EventSource API', 'blue');
  log('   - Check for CORS issues', 'blue');
  log('   - Verify no ad blockers are interfering', 'blue');
}

async function main() {
  log('🚀 SSE Connection Diagnostic Tool', 'bright');
  log('================================', 'bright');
  
  log(`\nBase URL: ${config.baseUrl}`, 'blue');
  log(`Debug Mode: ${config.debugMode ? 'Enabled' : 'Disabled'}`, 'blue');
  
  // Check environment variables
  const envOk = checkEnvironmentVariables();
  
  // Test SSE endpoint
  const sseOk = await testSSEEndpoint();
  
  // Test debug endpoint
  const debugOk = await testSSEDebugEndpoint();
  
  // Summary
  log('\n📊 Diagnostic Summary:', 'bright');
  log('====================', 'bright');
  log(`Environment Variables: ${envOk ? '✅ OK' : '❌ Issues'}`, envOk ? 'green' : 'red');
  log(`SSE Endpoint: ${sseOk ? '✅ OK' : '❌ Issues'}`, sseOk ? 'green' : 'red');
  log(`Debug Endpoint: ${debugOk ? '✅ OK' : '❌ Issues'}`, debugOk ? 'green' : 'red');
  
  if (!envOk || !sseOk) {
    provideRecommendations();
  } else {
    log('\n🎉 All tests passed! SSE should be working correctly.', 'green');
  }
  
  log('\nFor more help, check the SSE_TROUBLESHOOTING.md file.', 'cyan');
}

// Run the diagnostic
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Diagnostic failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, testSSEEndpoint, testSSEDebugEndpoint, checkEnvironmentVariables };
