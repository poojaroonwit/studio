// Simple test script for the new position candidates API endpoint
const fetch = require('node-fetch');

async function testPositionCandidatesAPI() {
  try {
    // Replace with an actual position ID from your database
    const positionId = 'your-position-id-here';
    
    console.log('Testing position candidates API...');
    
    // Test the new endpoint with different parameters
    const testCases = [
      { page: 1, limit: 10, description: 'First page, 10 items' },
      { page: 1, limit: 20, description: 'First page, 20 items' },
      { page: 2, limit: 10, description: 'Second page, 10 items' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n--- Testing: ${testCase.description} ---`);
      
      const queryParams = new URLSearchParams({
        page: testCase.page.toString(),
        limit: testCase.limit.toString(),
        sortColumn: 'applicationDate',
        sortDirection: 'desc'
      });
      
      const response = await fetch(`http://localhost:3000/api/positions/${positionId}/candidates?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Response:', {
          total: data.pagination?.total,
          page: data.pagination?.page,
          limit: data.pagination?.limit,
          totalPages: data.pagination?.totalPages,
          candidatesCount: data.data?.length,
          associationTypes: data.data?.reduce((acc, candidate) => {
            acc[candidate.associationType] = (acc[candidate.associationType] || 0) + 1;
            return acc;
          }, {})
        });
        
        // Show first few candidates with their association types
        if (data.data && data.data.length > 0) {
          console.log('Sample candidates:');
          data.data.slice(0, 3).forEach((candidate, index) => {
            console.log(`  ${index + 1}. ${candidate.name} (${candidate.email}) - ${candidate.associationType}`);
          });
        }
      } else {
        console.error('❌ API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPositionCandidatesAPI(); 