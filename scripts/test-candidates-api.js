import fetch from 'node-fetch';

async function testCandidatesAPI() {
  console.log('🧪 Testing candidates API endpoint...');
  
  try {
    const response = await fetch('http://localhost:8021/api/candidates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Response data:`, JSON.stringify(data, null, 2));
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`📊 Number of candidates returned: ${data.data.length}`);
        if (data.data.length > 0) {
          console.log(`📊 First candidate:`, data.data[0]);
        }
      } else {
        console.log(`📊 No candidates array found in response`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error response: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testCandidatesAPI(); 