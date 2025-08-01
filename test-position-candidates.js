// Simple test script for the new position candidates API endpoint
const fetch = require('node-fetch');

async function testPositionCandidatesAPI() {
  try {
    // Replace with an actual position ID from your database
    const positionId = 'your-position-id-here';
    
    console.log('Testing position candidates API...');
    
    // Test the new endpoint
    const response = await fetch(`http://localhost:3000/api/positions/${positionId}/candidates?page=1&limit=10`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', {
        total: data.pagination?.total,
        page: data.pagination?.page,
        limit: data.pagination?.limit,
        totalPages: data.pagination?.totalPages,
        candidatesCount: data.data?.length,
        sampleCandidate: data.data?.[0] ? {
          id: data.data[0].id,
          name: data.data[0].name,
          email: data.data[0].email,
          associationType: data.data[0].associationType
        } : null
      });
    } else {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPositionCandidatesAPI(); 