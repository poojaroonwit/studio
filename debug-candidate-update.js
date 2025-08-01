// Debug script to test candidate update API
const fetch = require('node-fetch');

async function testCandidateUpdate() {
  const candidateId = '9ac70c0c-5475-46d1-b39d-dfcf80a1c5e9';
  const newStatus = 'Screening';
  
  console.log('Testing candidate update for ID:', candidateId);
  console.log('New status:', newStatus);
  
  try {
    const response = await fetch(`http://localhost:3000/api/candidates/${candidateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Add any required auth headers here
      },
      body: JSON.stringify({
        status: newStatus
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      console.error('Request failed with status:', response.status);
    } else {
      console.log('Request successful!');
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testCandidateUpdate(); 