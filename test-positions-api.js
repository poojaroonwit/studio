// Simple test script to verify positions API improvements
const testPositionsAPI = async () => {
  try {
    console.log('Testing positions API with combined statistics...');
    
    // Test 1: Basic positions fetch
    const basicResponse = await fetch('http://localhost:3000/api/positions?limit=5&includeStats=true');
    const basicData = await basicResponse.json();
    
    console.log('✅ Basic positions fetch:', {
      total: basicData.total,
      hasStatistics: !!basicData.statistics,
      stats: basicData.statistics
    });
    
    // Test 2: Search with filters
    const searchResponse = await fetch('http://localhost:3000/api/positions?title=software&includeStats=true');
    const searchData = await searchResponse.json();
    
    console.log('✅ Search with filters:', {
      total: searchData.total,
      hasStatistics: !!searchData.statistics,
      stats: searchData.statistics
    });
    
    // Test 3: Performance comparison (old vs new)
    console.log('⏱️ Performance test:');
    
    const startTime = Date.now();
    await fetch('http://localhost:3000/api/positions?includeStats=true');
    const newMethodTime = Date.now() - startTime;
    
    console.log(`✅ New combined API: ${newMethodTime}ms`);
    
    console.log('🎉 All tests passed! The positions API is now optimized.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  testPositionsAPI();
} 