async function testApiEndpoint() {
  console.log('🔍 Testing API endpoint...');
  
  // Dynamic import for node-fetch
  const fetch = (await import('node-fetch')).default;
  
  const candidateId = '419c85b4-642e-4ce7-b790-4b4090660409';
  const baseUrl = 'http://localhost:8021';
  
  // Test HEAD request first
  console.log('📡 Testing HEAD request...');
  try {
    const headResponse = await fetch(`${baseUrl}/api/candidates/${candidateId}`, {
      method: 'HEAD',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ HEAD Response Status:', headResponse.status);
    console.log('✅ HEAD Response Headers:', Object.fromEntries(headResponse.headers.entries()));
    
  } catch (error) {
    console.error('❌ HEAD request failed:', error.message);
  }
  
  // Test GET request
  console.log('\n📡 Testing GET request...');
  try {
    const getResponse = await fetch(`${baseUrl}/api/candidates/${candidateId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ GET Response Status:', getResponse.status);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ GET Response Data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await getResponse.text();
      console.error('❌ GET Response Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ GET request failed:', error.message);
  }
}

// Run the test
testApiEndpoint().catch(console.error);
