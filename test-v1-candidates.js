const https = require('https');
const http = require('http');

// Test the v1 candidates endpoint
async function testV1Candidates() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3YmZmYjkyLWM4NTMtNDRmNy04YWIyLTVlYWQxYTYyMjM0OCIsImVtYWlsIjoiYWRtaW5AbmNjLmNvbSIsInJvbGUiOiJBZG1pbiIsIm1vZHVsZVBlcm1pc3Npb25zIjpbIkNBTkRJREFURVNfVklFVyIsIkNBTkRJREFURVNfTUFOQUdFIiwiQ0FORElEQVRFU19JTVBPUlQiLCJDQU5ESURBVEVTX0VYUE9SVCIsIlBPU0lUSU9OU19WSUVXIiwiUE9TSVRJT05TX01BTkFHRSIsIlBPU0lUSU9OU19JTVBPUlQiLCJQT1NJVElPTlNfRVhQT1JUIiwiVVNFUlNfTUFOQUdFIiwiVVNFUl9HUk9VUFNfTUFOQUdFIiwiU1lTVEVNX1NFVFRJTkdTX01BTkFHRSIsIlVTRVJfUFJFRkVSRU5DRVNfTUFOQUdFIiwiUkVDUlVJVEVNRU5UX1NUQUdFU19NQU5BR0UiLCJDVVNUT01fRklFTERTX01BTkFHRSIsIkxPR1NfVklFVyIsIkFJX0lOVEVHUkFUSU9OX01BTkFHRSIsIkFOQUxZVElDU19WSUVXIiwiQVBJX0tFWVNfTUFOQUdFIiwiQVVESVRfTE9HU19WSUVXIiwiQVVUT01BVElPTl9VUExPQVQiLCJCVUxLX1VQTE9BRCIsIkNBTkRJREFURVNfQ09NTUVOVFMiLCJDQU5ESURBVEVTX1JFQ1JVSVRFUl9BU1NJR04iLCJDQU5ESURBVEVTX1JFU1VNRVMiLCJDQU5ESURBVEVTX1RSQU5TSVRJT05TIiwiREFTSFJPQVJEX1ZJRVciLCJGSU5BTkNFX0RFUEFSVE1FTlRfTUFOQUdFIiwiSFJfREVQQVJUTUVOVF9NQU5BR0UiLCJJVF9ERVBBUlRNRU5UX01BTkFHRSIsIk1BUktFVElOR19ERVBBUlRNRU5UX01BTkFHRSIsIlVQTE9BRF9RVUVVRV9NQU5BR0UiLCJXRUJIT09LX0FOQUxZVElDU19WSUVXIiwiV0VCSE9PS19MT0dTX1ZJRVciLCJXRUJIT09LX01BUFBJTkdfTUFOQUdFIl0sImlhdCI6MTc1MjY0MDQzNywiZXhwIjoxNzUyNjQ0MDM3fQ.sv9iKPFO2UIm_EglY9l4B3yrckq1WE6K_xcYoET1zio";

  const testPayload = {
    candidate_info: {
      contact_info: {
        email: "test@example.com",
        phone: "+1234567890"
      },
      personal_info: {
        firstname: "Test",
        lastname: "User"
      },
      status: "new"
    }
  };

  const postData = JSON.stringify(testPayload);

  const options = {
    hostname: '10.0.10.71',
    port: 8021,
    path: '/api/v1/candidates',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response Body:');
      console.log(data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testV1Candidates(); 