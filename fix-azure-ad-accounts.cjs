const https = require('https');
const http = require('http');

const url = 'http://localhost:8021/api/debug/fix-azure-ad-accounts';

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(url, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    console.log('Response body:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end(); 