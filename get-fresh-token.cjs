const http = require('http');

// Get a fresh JWT token
function getFreshToken() {
  const postData = JSON.stringify({
    email: "admin@ncc.com",
    password: "nccadmin"
  });

  const options = {
    hostname: '10.0.10.71',
    port: 8021,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
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
      
      try {
        const response = JSON.parse(data);
        if (response.success && response.data && response.data.token) {
          console.log('\n=== FRESH TOKEN ===');
          console.log(response.data.token);
          console.log('==================\n');
        }
      } catch (e) {
        console.error('Error parsing response:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

getFreshToken(); 