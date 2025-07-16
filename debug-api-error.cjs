const http = require('http');

// Helper to make HTTP requests
function makeRequest(options, postData, callback) {
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => { callback(null, res, data); });
  });
  req.on('error', (e) => { callback(e); });
  if (postData) req.write(postData);
  req.end();
}

// Step 1: Get token
const loginData = JSON.stringify({
  email: 'admin@ncc.com',
  password: 'nccadmin'
});
const loginOptions = {
  hostname: 'localhost',
  port: 8021,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

makeRequest(loginOptions, loginData, (err, res, data) => {
  if (err) return console.error('Login error:', err);
  let token;
  try {
    const parsed = JSON.parse(data);
    token = parsed.data && parsed.data.token;
  } catch (e) {
    return console.error('Failed to parse login response:', data);
  }
  if (!token) {
    return console.error('Failed to get token:', data);
  }
  console.log('Got token:', token);

  // Step 2: Authenticated POST to /api/v1/candidates
  const postData = JSON.stringify({
    candidate_info: {
      personal_info: {
        firstname: 'Debug',
        lastname: 'Test'
      },
      contact_info: {
        email: 'debug.test.unique@example.com'
      }
    }
  });
  const options = {
    hostname: 'localhost',
    port: 8021,
    path: '/api/v1/candidates',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': 'Bearer ' + token
    }
  };
  makeRequest(options, postData, (err, res, data) => {
    if (err) return console.error('Error:', err);
    console.log('Status:', res.statusCode);
    console.log('Status Text:', res.statusMessage);
    console.log('Headers:', res.headers);
    console.log('Response Body:');
    console.log(data);
  });
}); 