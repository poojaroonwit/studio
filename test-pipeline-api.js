// Test script to check recruitment pipeline API endpoints
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testCandidateId: 'test-candidate-id' // You'll need to replace this with a real candidate ID
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    return {
      statusCode: response.status,
      ok: response.ok,
      data: response.ok ? await response.json() : null,
      error: !response.ok ? await response.text() : null
    };
  } catch (error) {
    return {
      statusCode: 0,
      ok: false,
      data: null,
      error: error.message
    };
  }
}

async function testPipelineAPIs() {
  console.log('🧪 Testing Recruitment Pipeline API Endpoints...\n');

  // Test 1: Check recruitment stages API
  console.log('1. Testing /api/recruitment-stages...');
  const stagesResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/recruitment-stages`);
  
  if (stagesResponse.ok) {
    console.log('✅ Recruitment stages API is working');
    console.log(`   Found ${stagesResponse.data?.length || 0} stages`);
    if (stagesResponse.data?.length > 0) {
      console.log('   Sample stages:', stagesResponse.data.slice(0, 3).map(s => s.name));
    }
  } else {
    console.log('❌ Recruitment stages API failed:', stagesResponse.error);
  }

  // Test 2: Check transitions API (this will fail without a real candidate ID)
  console.log('\n2. Testing /api/transitions...');
  const transitionsResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/transitions?candidateId=${TEST_CONFIG.testCandidateId}`);
  
  if (transitionsResponse.ok) {
    console.log('✅ Transitions API is working');
    console.log(`   Found ${transitionsResponse.data?.length || 0} transitions`);
  } else if (transitionsResponse.statusCode === 400) {
    console.log('⚠️  Transitions API requires a valid candidate ID (expected behavior)');
  } else {
    console.log('❌ Transitions API failed:', transitionsResponse.error);
  }

  // Test 3: Check if there are any candidates in the system
  console.log('\n3. Testing /api/candidates to find a real candidate ID...');
  const candidatesResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/candidates?limit=1`);
  
  if (candidatesResponse.ok && candidatesResponse.data?.candidates?.length > 0) {
    const realCandidateId = candidatesResponse.data.candidates[0].id;
    console.log(`✅ Found candidate with ID: ${realCandidateId}`);
    
    // Test transitions API with real candidate ID
    console.log('\n4. Testing /api/transitions with real candidate ID...');
    const realTransitionsResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/transitions?candidateId=${realCandidateId}`);
    
    if (realTransitionsResponse.ok) {
      console.log('✅ Transitions API is working with real candidate ID');
      console.log(`   Found ${realTransitionsResponse.data?.length || 0} transitions`);
    } else {
      console.log('❌ Transitions API failed with real candidate ID:', realTransitionsResponse.error);
    }
  } else {
    console.log('⚠️  No candidates found in the system');
  }

  console.log('\n🎯 Summary:');
  console.log('- Recruitment stages API:', stagesResponse.ok ? '✅ Working' : '❌ Failed');
  console.log('- Transitions API:', transitionsResponse.statusCode === 400 ? '✅ Working (requires valid candidate ID)' : transitionsResponse.ok ? '✅ Working' : '❌ Failed');
}

testPipelineAPIs().catch(console.error);
