#!/usr/bin/env node

/**
 * Test Script: Task Board Card Click Timeout Fix
 * 
 * This script tests the fixes implemented for the task board card click timeout issue.
 * It simulates the API calls that happen when clicking a task board card.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Test configuration
const TEST_CONFIG = {
  candidateId: process.env.TEST_CANDIDATE_ID || '550e8400-e29b-41d4-a716-446655440000', // Example UUID
  timeoutMs: 30000, // 30 seconds
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:8021',
  apiKey: process.env.PROCESSOR_API_KEY || 'test-api-key'
};

// Database connection for direct testing
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 10,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 1800000,
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT) || 25000,
  allowExitOnIdle: false,
});

// Utility functions
function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data);
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${message}:`, error);
}

function logSuccess(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ✅ ${message}`, data);
}

// Test 1: Database Connection Test
async function testDatabaseConnection() {
  log('Testing database connection...');
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
    logSuccess('Database connection successful', { 
      currentTime: result.rows[0].current_time 
    });
    return true;
  } catch (error) {
    logError('Database connection failed', error);
    return false;
  }
}

// Test 2: Candidate API Endpoint Test
async function testCandidateAPI() {
  log('Testing candidate API endpoint...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_CONFIG.timeoutMs);
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=30',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      logSuccess('Candidate API endpoint working', { 
        status: response.status,
        candidateId: data.id,
        hasJobMatches: data.jobMatches?.length || 0,
        hasAttachments: data.attachmentHistory?.length || 0
      });
      return true;
    } else {
      logError('Candidate API endpoint failed', { 
        status: response.status, 
        statusText: response.statusText 
      });
      return false;
    }
  } catch (error) {
    logError('Candidate API endpoint error', error);
    return false;
  }
}

// Test 3: Comments API Endpoint Test
async function testCommentsAPI() {
  log('Testing comments API endpoint...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}/comments?limit=5&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      logSuccess('Comments API endpoint working', { 
        status: response.status,
        commentCount: Array.isArray(data) ? data.length : (data.data?.length || 0)
      });
      return true;
    } else {
      logError('Comments API endpoint failed', { 
        status: response.status, 
        statusText: response.statusText 
      });
      return false;
    }
  } catch (error) {
    logError('Comments API endpoint error', error);
    return false;
  }
}

// Test 4: Attachments API Endpoint Test
async function testAttachmentsAPI() {
  log('Testing attachments API endpoint...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}/resumes?limit=20&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      logSuccess('Attachments API endpoint working', { 
        status: response.status,
        attachmentCount: Array.isArray(data) ? data.length : (data.data?.length || 0)
      });
      return true;
    } else {
      logError('Attachments API endpoint failed', { 
        status: response.status, 
        statusText: response.statusText 
      });
      return false;
    }
  } catch (error) {
    logError('Attachments API endpoint error', error);
    return false;
  }
}

// Test 5: Parallel API Calls Test (simulates task board card click)
async function testParallelAPICalls() {
  log('Testing parallel API calls (simulating task board card click)...');
  
  try {
    const startTime = Date.now();
    
    // Simulate the parallel API calls that happen when clicking a task board card
    const results = await Promise.allSettled([
      fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}/comments?limit=5&offset=0`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}/resumes?limit=20&offset=0`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    ]);
    
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    const failed = results.length - successful;
    
    logSuccess('Parallel API calls test completed', {
      totalTime: `${totalTime}ms`,
      successful,
      failed,
      averageTime: `${Math.round(totalTime / results.length)}ms per request`
    });
    
    return successful === results.length;
  } catch (error) {
    logError('Parallel API calls test failed', error);
    return false;
  }
}

// Test 6: Database Query Performance Test
async function testDatabaseQueryPerformance() {
  log('Testing database query performance...');
  
  try {
    const client = await pool.connect();
    
    // Set statement timeout
    await client.query('SET statement_timeout = 25000');
    
    const startTime = Date.now();
    
    // Test the optimized candidate query
    const candidateQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.status,
        c."positionId",
        c."recruiterId",
        c."sourceId",
        c."fitScore",
        c."avatarUrl",
        c."resumePath",
        c."transitionNotes",
        c."assignmentJustification",
        c."parsedData",
        c."customAttributes",
        c."createdAt",
        c."updatedAt",
        c."applicationDate",
        p.title as "positionTitle", 
        p.department as "positionDepartment",
        r.name as "recruiterName", 
        r."avatarUrl" as "recruiterAvatarUrl",
        cs.name as "sourceName", 
        cs.description as "sourceDescription", 
        cs.logo as "sourceLogo"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1::uuid
    `;
    
    const result = await client.query(candidateQuery, [TEST_CONFIG.candidateId]);
    const queryTime = Date.now() - startTime;
    
    client.release();
    
    if (result.rows.length > 0) {
      logSuccess('Database query performance test passed', {
        queryTime: `${queryTime}ms`,
        candidateFound: true,
        candidateName: result.rows[0].name
      });
      return true;
    } else {
      logError('Database query performance test failed - candidate not found', {
        queryTime: `${queryTime}ms`,
        candidateId: TEST_CONFIG.candidateId
      });
      return false;
    }
  } catch (error) {
    logError('Database query performance test failed', error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Task Board Card Click Timeout Fix Tests\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Candidate API Endpoint', fn: testCandidateAPI },
    { name: 'Comments API Endpoint', fn: testCommentsAPI },
    { name: 'Attachments API Endpoint', fn: testAttachmentsAPI },
    { name: 'Parallel API Calls', fn: testParallelAPICalls },
    { name: 'Database Query Performance', fn: testDatabaseQueryPerformance }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} Test ---`);
    const startTime = Date.now();
    const success = await test.fn();
    const duration = Date.now() - startTime;
    
    results.push({
      name: test.name,
      success,
      duration: `${duration}ms`
    });
    
    if (success) {
      logSuccess(`${test.name} test passed`, { duration: `${duration}ms` });
    } else {
      logError(`${test.name} test failed`, { duration: `${duration}ms` });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.duration}`);
  });
  
  console.log(`\n📈 Overall: ${passed}/${results.length} tests passed`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The task board card click timeout issue should be resolved.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please check the logs above for details.`);
  }
  
  // Cleanup
  await pool.end();
}

// Run tests
runTests().catch(error => {
  logError('Test runner failed', error);
  process.exit(1);
});
