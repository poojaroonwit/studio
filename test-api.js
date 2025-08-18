const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:8021';
const TEST_TIMEOUT = 10000; // 10 seconds

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

async function testCandidatesAPI() {
  console.log('Testing candidates API...');
  
  // Test with the position ID we found in the database
  const positionId = '812e49ec-f8cd-4c7c-b519-c0d4eac9f876';
  
  // Test different types of requests
  const testCases = [
    {
      name: 'All candidates',
      url: `${BASE_URL}/api/positions/${positionId}/candidates?type=all&page=1&limit=20`
    },
    {
      name: 'Applied candidates only',
      url: `${BASE_URL}/api/positions/${positionId}/candidates?type=applied&page=1&limit=20`
    },
    {
      name: 'Matched candidates only',
      url: `${BASE_URL}/api/positions/${positionId}/candidates?type=matched&page=1&limit=20`
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      const response = await makeRequest(testCase.url);
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        console.log(`   ✅ Success`);
        console.log(`   Total candidates: ${response.data.pagination?.total || 0}`);
        console.log(`   Data length: ${response.data.data?.length || 0}`);
        
        if (response.data.data && response.data.data.length > 0) {
          console.log(`   📋 First candidate: ${response.data.data[0].name} (${response.data.data[0].email})`);
          console.log(`   Association type: ${response.data.data[0].associationType}`);
        } else {
          console.log(`   📋 No candidates returned`);
        }
      } else if (response.status === 401) {
        console.log(`   ❌ Unauthorized - need authentication`);
      } else {
        console.log(`   ❌ Error: ${response.status}`);
        if (response.data) {
          console.log(`   Error details:`, response.data);
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }
}

testCandidatesAPI();
