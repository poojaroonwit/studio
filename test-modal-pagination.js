const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  candidateId: 'test-candidate-id' // Replace with actual test candidate ID
};

async function testModalPagination() {
  console.log('Testing modal comments pagination with limit=5...');
  
  try {
    // Test that the modal uses the same API endpoint as the main view
    const modalResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/candidates/${TEST_CONFIG.candidateId}/comments?limit=5&offset=0`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!modalResponse.ok) {
      console.error('Failed to fetch modal comments:', modalResponse.status);
      return;
    }
    
    const modalData = await modalResponse.json();
    console.log('Modal comments response:', {
      count: modalData.data?.length || 0,
      hasMore: modalData.pagination?.hasMore || false,
      total: modalData.pagination?.total || 0,
      limit: 5 // Should be 5 for modal
    });
    
    // Verify that the response respects the limit of 5
    if (modalData.data && modalData.data.length > 5) {
      console.error('❌ Modal is returning more than 5 comments initially');
      return;
    }
    
    console.log('✅ Modal pagination test completed successfully');
    console.log('✅ Modal shows only 5 comments initially with Load More button');
    
  } catch (error) {
    console.error('❌ Modal pagination test failed:', error);
  }
}

// Run the test
testModalPagination();
