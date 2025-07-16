import fetch from 'node-fetch';

async function testJobMatches() {
  const candidateId = 'd6b21bea-779c-4115-bacc-04293c2588ee';
  const url = `http://localhost:3000/api/v1/candidates/${candidateId}/job-matches`;
  
  console.log(`🔍 Testing job-matches API...`);
  console.log(`URL: ${url}`);
  
  try {
    // Test without authentication first
    console.log('\n1. Testing without authentication...');
    const response1 = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response1.status}`);
    const body1 = await response1.text();
    console.log(`   Body: ${body1}`);
    
    // Test with invalid token
    console.log('\n2. Testing with invalid token...');
    const response2 = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    console.log(`   Status: ${response2.status}`);
    const body2 = await response2.text();
    console.log(`   Body: ${body2}`);
    
    // Test with empty token
    console.log('\n3. Testing with empty token...');
    const response3 = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '
      }
    });
    
    console.log(`   Status: ${response3.status}`);
    const body3 = await response3.text();
    console.log(`   Body: ${body3}`);
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testJobMatches().catch(console.error); 