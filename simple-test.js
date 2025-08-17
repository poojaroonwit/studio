const http = require('http');

console.log('🔍 Testing server connectivity...\n');

// Test server connectivity
function testServer() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`✅ Server is running! Status: ${res.statusCode}`);
        console.log(`📄 Response: ${data.substring(0, 200)}...`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Server connection failed: ${error.message}`);
      console.log('\n🔧 Troubleshooting tips:');
      console.log('   1. Make sure the development server is running (npm run dev)');
      console.log('   2. Check if port 3000 is available');
      console.log('   3. Verify the server started without errors');
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('⏰ Request timeout - server might be starting up');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test a few key endpoints
async function testKeyEndpoints() {
  const endpoints = [
    { name: 'Health Check', path: '/api/v1/health' },
    { name: 'Auth Login', path: '/api/v1/auth/login', method: 'POST' },
    { name: 'Candidates', path: '/api/v1/candidates' },
    { name: 'Positions', path: '/api/v1/positions' },
    { name: 'Recruitment Stages', path: '/api/v1/recruitment-stages' },
    { name: 'Dashboard', path: '/api/v1/dashboard' },
    { name: 'Logs', path: '/api/v1/logs' },
    { name: 'Transitions', path: '/api/v1/transitions' },
    { name: 'Settings', path: '/api/v1/settings' },
    { name: 'AI Search', path: '/api/v1/ai/search-candidates', method: 'POST' }
  ];

  console.log('\n🧪 Testing key V1 API endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      const response = await testEndpoint(endpoint);
      if (response.status === 401) {
        console.log(`🔐 ${endpoint.name}: Authentication required (expected)`);
      } else if (response.status === 403) {
        console.log(`🚫 ${endpoint.name}: Forbidden (expected for some endpoints)`);
      } else if (response.status >= 200 && response.status < 300) {
        console.log(`✅ ${endpoint.name}: Success (${response.status})`);
      } else {
        console.log(`⚠️  ${endpoint.name}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
}

function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint.path,
      method: endpoint.method || 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (endpoint.method === 'POST') {
      req.write(JSON.stringify({ test: 'data' }));
    }
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    await testServer();
    await testKeyEndpoints();
    console.log('\n✨ Basic connectivity test complete!');
  } catch (error) {
    console.log('\n💥 Test failed. Please check server status.');
  }
}

runTests();
