const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  candidateId: 'test-candidate-id' // Replace with actual test candidate ID
};

async function testCommentsPagination() {
  console.log('Testing comments pagination with limit=5...');
  
  try {
    // Test initial load with limit=5
    const initialResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}/comments?limit=5&offset=0`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!initialResponse.ok) {
      console.error('Failed to fetch initial comments:', initialResponse.status);
      return;
    }
    
    const initialData = await initialResponse.json();
    console.log('Initial comments response:', {
      count: initialData.data?.length || 0,
      hasMore: initialData.pagination?.hasMore || false,
      total: initialData.pagination?.total || 0
    });
    
    // Test loading more comments
    if (initialData.pagination?.hasMore) {
      const moreResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}/comments?limit=5&offset=5`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (moreResponse.ok) {
        const moreData = await moreResponse.json();
        console.log('More comments response:', {
          count: moreData.data?.length || 0,
          hasMore: moreData.pagination?.hasMore || false,
          total: moreData.pagination?.total || 0
        });
      }
    }
    
    console.log('✅ Comments pagination test completed successfully');
    
  } catch (error) {
    console.error('❌ Comments pagination test failed:', error);
  }
}

// Run the test
testCommentsPagination();
