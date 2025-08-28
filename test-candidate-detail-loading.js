// Test script to verify candidate detail loading
const fetch = require('node-fetch');

async function testCandidateDetailLoading() {
  console.log('Testing candidate detail loading...');
  
  try {
    // Test HEAD request (validation)
    console.log('\n1. Testing HEAD request for candidate validation...');
    const headResponse = await fetch('http://localhost:3000/api/candidates/test-id', {
      method: 'HEAD'
    });
    console.log('HEAD Response status:', headResponse.status);
    
    // Test GET request (actual data)
    console.log('\n2. Testing GET request for candidate data...');
    const getResponse = await fetch('http://localhost:3000/api/candidates/test-id', {
      method: 'GET'
    });
    console.log('GET Response status:', getResponse.status);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('Candidate data received:', !!data);
      console.log('Candidate ID:', data.id);
    }
    
    // Test comments endpoint
    console.log('\n3. Testing comments endpoint...');
    const commentsResponse = await fetch('http://localhost:3000/api/candidates/test-id/comments');
    console.log('Comments Response status:', commentsResponse.status);
    
    // Test resumes endpoint
    console.log('\n4. Testing resumes endpoint...');
    const resumesResponse = await fetch('http://localhost:3000/api/candidates/test-id/resumes');
    console.log('Resumes Response status:', resumesResponse.status);
    
  } catch (error) {
    console.error('Error testing candidate detail loading:', error.message);
  }
}

// Run the test
testCandidateDetailLoading();
