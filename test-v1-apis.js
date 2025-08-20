const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
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

    req.setTimeout(TEST_TIMEOUT);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Test function
async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(url, options);
    const duration = Date.now() - startTime;
    
    const isSuccess = response.status >= 200 && response.status < 300;
    const isAuthError = response.status === 401;
    const isForbidden = response.status === 403;
    
    let result = {
      name,
      url,
      status: response.status,
      duration,
      success: isSuccess,
      authError: isAuthError,
      forbidden: isForbidden,
      data: response.data
    };
    
    if (isSuccess) {
      console.log(`   ✅ PASSED (${response.status}) - ${duration}ms`);
      testResults.passed++;
    } else if (isAuthError) {
      console.log(`   🔐 AUTH REQUIRED (${response.status}) - ${duration}ms`);
      testResults.passed++; // Auth errors are expected without tokens
    } else if (isForbidden) {
      console.log(`   🚫 FORBIDDEN (${response.status}) - ${duration}ms`);
      testResults.passed++; // Forbidden errors are expected without proper permissions
    } else {
      console.log(`   ❌ FAILED (${response.status}) - ${duration}ms`);
      testResults.failed++;
      testResults.errors.push(`${name}: HTTP ${response.status}`);
    }
    
    testResults.details.push(result);
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`${name}: ${error.message}`);
    testResults.details.push({
      name,
      url,
      error: error.message,
      success: false
    });
  }
}

// Test all v1 APIs
async function testAllV1APIs() {
  console.log('🚀 Starting V1 API Tests...\n');
  console.log('=' .repeat(60));
  
  // Health check (no auth required)
  await testEndpoint('Health Check', `${BASE_URL}/api/v1/health`);
  
  // Auth endpoints
  await testEndpoint('Auth Login', `${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    body: {
      email: 'test@example.com',
      password: 'testpassword'
    }
  });
  
  // Candidates endpoints (require auth)
  await testEndpoint('Get Candidates', `${BASE_URL}/api/v1/candidates`);
  await testEndpoint('Get Candidates with Pagination', `${BASE_URL}/api/v1/candidates?page=1&limit=10`);
  await testEndpoint('Get Candidates with Filters', `${BASE_URL}/api/v1/candidates?title=developer&department=engineering`);
  
  // Candidates bulk operations
  await testEndpoint('Candidates Bulk Action', `${BASE_URL}/api/v1/candidates/bulk-action`, {
    method: 'POST',
    body: {
      action: 'delete',
      candidateIds: ['test-id']
    }
  });
  
  await testEndpoint('Candidates Bulk Upload', `${BASE_URL}/api/v1/candidates/bulk-upload`, {
    method: 'POST',
    body: {
      candidates: []
    }
  });
  
  // Candidates export/import
  await testEndpoint('Candidates Export', `${BASE_URL}/api/v1/candidates/export`);
  await testEndpoint('Candidates Import', `${BASE_URL}/api/v1/candidates/import`, {
    method: 'POST',
    body: {
      file: 'test.csv'
    }
  });
  
  // Candidates validation
  await testEndpoint('Candidates Test Validation', `${BASE_URL}/api/v1/candidates/test-validation`, {
    method: 'POST',
    body: {
      email: 'test@example.com'
    }
  });
  
  // Individual candidate endpoints
  await testEndpoint('Get Candidate by ID', `${BASE_URL}/api/v1/candidates/test-id`);
  await testEndpoint('Update Candidate', `${BASE_URL}/api/v1/candidates/test-id`, {
    method: 'PUT',
    body: {
      name: 'Test Candidate',
      email: 'test@example.com'
    }
  });
  await testEndpoint('Delete Candidate', `${BASE_URL}/api/v1/candidates/test-id`, {
    method: 'DELETE'
  });
  
  // Candidate attachments
  await testEndpoint('Get Candidate Attachments', `${BASE_URL}/api/v1/candidates/test-id/attachments`);
  await testEndpoint('Upload Candidate Attachment', `${BASE_URL}/api/v1/candidates/test-id/attachments`, {
    method: 'POST',
    body: {
      file: 'test.pdf'
    }
  });
  
  // Candidate avatar
  await testEndpoint('Get Candidate Avatar', `${BASE_URL}/api/v1/candidates/test-id/avatar`);
  await testEndpoint('Upload Candidate Avatar', `${BASE_URL}/api/v1/candidates/test-id/avatar`, {
    method: 'POST',
    body: {
      file: 'avatar.jpg'
    }
  });
  
  // Candidate job applications
  await testEndpoint('Get Candidate Job Applications', `${BASE_URL}/api/v1/candidates/test-id/job-applications`);
  await testEndpoint('Create Candidate Job Application', `${BASE_URL}/api/v1/candidates/test-id/job-applications`, {
    method: 'POST',
    body: {
      positionId: 'test-position-id',
      status: 'applied'
    }
  });
  
  // Candidate job matches
  await testEndpoint('Get Candidate Job Matches', `${BASE_URL}/api/v1/candidates/test-id/job-matches`);
  await testEndpoint('Create Candidate Job Match', `${BASE_URL}/api/v1/candidates/test-id/job-matches`, {
    method: 'POST',
    body: {
      positionId: 'test-position-id',
      score: 85
    }
  });
  await testEndpoint('Update Candidate Job Match', `${BASE_URL}/api/v1/candidates/test-id/job-matches/test-match-id`, {
    method: 'PUT',
    body: {
      score: 90
    }
  });
  await testEndpoint('Delete Candidate Job Match', `${BASE_URL}/api/v1/candidates/test-id/job-matches/test-match-id`, {
    method: 'DELETE'
  });
  
  // Candidate recruitment stages
  await testEndpoint('Get Candidate Recruitment Stages', `${BASE_URL}/api/v1/candidates/test-id/recruitment-stages`);
  await testEndpoint('Update Candidate Recruitment Stage', `${BASE_URL}/api/v1/candidates/test-id/recruitment-stages`, {
    method: 'PUT',
    body: {
      stageId: 'test-stage-id'
    }
  });
  
  // Candidate resumes
  await testEndpoint('Get Candidate Resumes', `${BASE_URL}/api/v1/candidates/test-id/resumes`);
  await testEndpoint('Upload Candidate Resume', `${BASE_URL}/api/v1/candidates/test-id/resumes`, {
    method: 'POST',
    body: {
      file: 'resume.pdf'
    }
  });
  
  // Positions endpoints
  await testEndpoint('Get Positions', `${BASE_URL}/api/v1/positions`);
  await testEndpoint('Get Positions with Pagination', `${BASE_URL}/api/v1/positions?page=1&limit=10`);
  await testEndpoint('Get Positions with Filters', `${BASE_URL}/api/v1/positions?title=developer&department=engineering`);
  
  // Positions bulk operations
  await testEndpoint('Positions Bulk Action', `${BASE_URL}/api/v1/positions/bulk-action`, {
    method: 'POST',
    body: {
      action: 'delete',
      positionIds: ['test-id']
    }
  });
  
  // Positions export/import
  await testEndpoint('Positions Export', `${BASE_URL}/api/v1/positions/export`);
  await testEndpoint('Positions Import', `${BASE_URL}/api/v1/positions/import`, {
    method: 'POST',
    body: {
      file: 'positions.csv'
    }
  });
  
  // Individual position endpoints
  await testEndpoint('Get Position by ID', `${BASE_URL}/api/v1/positions/test-id`);
  await testEndpoint('Create Position', `${BASE_URL}/api/v1/positions`, {
    method: 'POST',
    body: {
      title: 'Test Position',
      department: 'Engineering'
    }
  });
  await testEndpoint('Update Position', `${BASE_URL}/api/v1/positions/test-id`, {
    method: 'PUT',
    body: {
      title: 'Updated Position',
      department: 'Engineering'
    }
  });
  await testEndpoint('Delete Position', `${BASE_URL}/api/v1/positions/test-id`, {
    method: 'DELETE'
  });
  
  // Recruitment stages
  await testEndpoint('Get Recruitment Stages', `${BASE_URL}/api/v1/recruitment-stages`);
  
  // AI search
  await testEndpoint('AI Search Candidates', `${BASE_URL}/api/v1/ai/search-candidates`, {
    method: 'POST',
    body: {
      query: 'software developer',
      limit: 10
    }
  });
  
  // Dashboard
  await testEndpoint('Get Dashboard', `${BASE_URL}/api/v1/dashboard`);
  
  // Logs (requires admin or LOGS_VIEW permission)
  await testEndpoint('Get Logs', `${BASE_URL}/api/v1/logs`);
  await testEndpoint('Get Logs with Pagination', `${BASE_URL}/api/v1/logs?page=1&limit=10`);
  await testEndpoint('Get Logs with Filters', `${BASE_URL}/api/v1/logs?level=info&startDate=2024-01-01`);
  
  // Transitions
  await testEndpoint('Get Transitions', `${BASE_URL}/api/v1/transitions`);
  await testEndpoint('Get Transitions with Filters', `${BASE_URL}/api/v1/transitions?candidateId=test-id`);
  await testEndpoint('Create Transition', `${BASE_URL}/api/v1/transitions`, {
    method: 'POST',
    body: {
      candidateId: 'test-id',
      fromStageId: 'stage-1',
      toStageId: 'stage-2',
      notes: 'Test transition'
    }
  });
  
  // Settings (requires admin)
  await testEndpoint('Get Settings', `${BASE_URL}/api/v1/settings`);
  
  // Upload queue
  await testEndpoint('Get Upload Queue', `${BASE_URL}/api/v1/upload-queue`);
  await testEndpoint('Create Upload Queue Item', `${BASE_URL}/api/v1/upload-queue`, {
    method: 'POST',
    body: {
      fileName: 'test.csv',
      fileType: 'csv',
      status: 'pending'
    }
  });
  
  // Users endpoints
  await testEndpoint('Get Users', `${BASE_URL}/api/v1/users`);
  await testEndpoint('Get Users with Pagination', `${BASE_URL}/api/v1/users?page=1&limit=10`);
  
  // Individual user endpoints
  await testEndpoint('Get User by ID', `${BASE_URL}/api/v1/users/test-id`);
  await testEndpoint('Create User', `${BASE_URL}/api/v1/users`, {
    method: 'POST',
    body: {
      name: 'Sample Test User',
      email: 'test@example.com',
      role: 'User'
    }
  });
  await testEndpoint('Update User', `${BASE_URL}/api/v1/users/test-id`, {
    method: 'PUT',
    body: {
      name: 'Updated User',
      email: 'updated@example.com'
    }
  });
  await testEndpoint('Delete User', `${BASE_URL}/api/v1/users/test-id`, {
    method: 'DELETE'
  });
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    testResults.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('   - Auth errors (401) are expected without valid JWT tokens');
  console.log('   - Forbidden errors (403) are expected without proper permissions');
  console.log('   - Some endpoints may fail due to missing test data');
  console.log('   - Consider running with valid authentication tokens for full testing');
  
  console.log('\n✨ V1 API Testing Complete!');
}

// Run the tests
testAllV1APIs().catch(console.error);
