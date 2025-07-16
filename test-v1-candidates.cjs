const http = require('http');

function testV1Candidates() {
  const postData = JSON.stringify({
    candidate_info: {
      personal_info: {
        firstname: "John",
        lastname: "Doe"
      },
      contact_info: {
        email: "john.doe@example.com"
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
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Status Text:', res.statusMessage);
    console.log('Headers:', res.headers);

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
    console.error('Error:', e.message);
  });

  req.write(postData);
  req.end();
}

testV1Candidates(); 