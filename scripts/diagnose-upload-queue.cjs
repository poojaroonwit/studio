#!/usr/bin/env node

/**
 * Upload Queue Processor Diagnostic Script
 * 
 * This script helps diagnose issues with the upload queue processor
 * by checking various components and configurations.
 */

require('dotenv').config({ path: '.env.local' });

const http = require('http');
const https = require('https');
const { Pool } = require('pg');

console.log('🔍 Upload Queue Processor Diagnostic Tool\n');

// Configuration
const config = {
  baseUrl: process.env.PROCESSOR_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'dev-key',
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV || 'development',
  dockerEnv: process.env.DOCKER_ENV || false
};

console.log('📊 Configuration:');
console.log(`  PROCESSOR_URL: ${config.baseUrl}`);
console.log(`  NODE_ENV: ${config.nodeEnv}`);
console.log(`  DOCKER_ENV: ${config.dockerEnv}`);
console.log(`  API Key: ${config.apiKey ? 'Set' : 'Missing'}`);
console.log(`  Database URL: ${config.databaseUrl ? 'Set' : 'Missing'}`);
console.log('');

// Test 1: Check if the app service is reachable
async function testAppService() {
  console.log('🔍 Test 1: Checking app service connectivity...');
  
  return new Promise((resolve) => {
    const url = new URL(config.baseUrl);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(`${config.baseUrl}/api/health`, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'UploadQueueDiagnostic/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ App service is reachable and healthy');
          try {
            const healthData = JSON.parse(data);
            console.log(`   Status: ${healthData.status}`);
            console.log(`   Database: ${healthData.database}`);
            console.log(`   Uptime: ${healthData.uptime}s`);
          } catch (e) {
            console.log('   Response received but not JSON');
          }
        } else {
          console.log(`❌ App service responded with status ${res.statusCode}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Cannot reach app service: ${error.message}`);
      console.log(`   URL: ${config.baseUrl}/api/health`);
      console.log(`   This might be a network connectivity issue`);
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('❌ App service health check timed out');
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

// Test 2: Check database connectivity
async function testDatabase() {
  console.log('\n🔍 Test 2: Checking database connectivity...');
  
  if (!config.databaseUrl) {
    console.log('❌ DATABASE_URL not configured');
    return;
  }
  
  try {
    const pool = new Pool({ connectionString: config.databaseUrl });
    const client = await pool.connect();
    
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`);
    
    // Check upload_queue table
    const tableResult = await client.query(`
      SELECT COUNT(*) as count, 
             COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
             COUNT(CASE WHEN status = 'inprocess' THEN 1 END) as inprocess,
             COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
             COUNT(CASE WHEN status = 'error' THEN 1 END) as error
      FROM upload_queue
    `);
    
    const stats = tableResult.rows[0];
    console.log('   Upload queue statistics:');
    console.log(`     Total jobs: ${stats.count}`);
    console.log(`     Queued: ${stats.queued}`);
    console.log(`     In process: ${stats.inprocess}`);
    console.log(`     Success: ${stats.success}`);
    console.log(`     Error: ${stats.error}`);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
  }
}

// Test 3: Check processor API endpoint
async function testProcessorEndpoint() {
  console.log('\n🔍 Test 3: Checking processor API endpoint...');
  
  return new Promise((resolve) => {
    const url = new URL(config.baseUrl);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(`${config.baseUrl}/api/upload-queue/process`, {
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'User-Agent': 'UploadQueueDiagnostic/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Processor endpoint is accessible');
          try {
            const response = JSON.parse(data);
            if (response.message && response.message.includes('No queued jobs')) {
              console.log('   Response: No queued jobs (normal)');
            } else {
              console.log(`   Response: ${JSON.stringify(response)}`);
            }
          } catch (e) {
            console.log('   Response received but not JSON');
          }
        } else if (res.statusCode === 401) {
          console.log('❌ Processor endpoint returned 401 Unauthorized');
          console.log('   Check your PROCESSOR_API_KEY configuration');
        } else {
          console.log(`❌ Processor endpoint returned status ${res.statusCode}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Cannot reach processor endpoint: ${error.message}`);
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('❌ Processor endpoint request timed out');
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

// Test 4: Environment analysis
function analyzeEnvironment() {
  console.log('\n🔍 Test 4: Environment analysis...');
  
  const issues = [];
  
  if (!config.apiKey) {
    issues.push('PROCESSOR_API_KEY is not set');
  }
  
  if (!config.databaseUrl) {
    issues.push('DATABASE_URL is not set');
  }
  
  if (config.baseUrl.includes('app:') && !config.dockerEnv && config.nodeEnv !== 'production') {
    issues.push('Using Docker service name (app:8021) but not in Docker environment');
  }
  
  if (config.baseUrl.includes('localhost') && config.dockerEnv) {
    issues.push('Using localhost but DOCKER_ENV is set');
  }
  
  if (issues.length === 0) {
    console.log('✅ Environment configuration looks good');
  } else {
    console.log('⚠️  Environment issues detected:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
}

// Main diagnostic function
async function runDiagnostics() {
  await testAppService();
  await testDatabase();
  await testProcessorEndpoint();
  analyzeEnvironment();
  
  console.log('\n📋 Summary:');
  console.log('If all tests pass, the upload queue processor should work correctly.');
  console.log('If any test fails, check the corresponding configuration.');
  console.log('');
  console.log('For Docker deployments:');
  console.log('- Ensure all services are running: docker-compose ps');
  console.log('- Check service logs: docker-compose logs upload-queue-processor');
  console.log('- Verify network connectivity between containers');
  console.log('');
  console.log('For local development:');
  console.log('- Start the main app: npm run dev');
  console.log('- Start the processor: npm run processor');
  console.log('- Or use: npm run dev:with-processor');
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  process.exit(1);
});
