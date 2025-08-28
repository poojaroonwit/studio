import fetch from 'node-fetch';

async function testCandidateAPI() {
  console.log('Testing candidate API...');
  
  try {
    // Test the API endpoint
    const response = await fetch('http://localhost:8021/api/candidates/test-id', {
      method: 'HEAD',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ API is responding');
    } else {
      console.log('❌ API returned error status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testCandidateAPI();
