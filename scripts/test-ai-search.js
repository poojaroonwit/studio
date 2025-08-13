/**
 * Test script to verify AI search functionality
 * This script tests the AI search API endpoint and verifies that it returns results
 */

async function testAiSearch() {
  console.log('🧪 Testing AI Search Functionality...\n');

  try {
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');

    // Test 1: Basic AI search request
    console.log('1. Testing basic AI search request...');
    
    const searchQuery = 'software engineer with React experience';
    const response = await fetch('http://localhost:3000/api/ai/search-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ AI search request successful');
    console.log('📊 Results:', {
      matchedCandidateIds: result.matchedCandidateIds?.length || 0,
      aiReasoning: result.aiReasoning?.substring(0, 100) + '...',
      hasResults: result.matchedCandidateIds && result.matchedCandidateIds.length > 0
    });

    // Test 2: Check if candidates endpoint returns data
    console.log('\n2. Testing candidates endpoint...');
    
    const candidatesResponse = await fetch('http://localhost:3000/api/candidates?limit=10');
    if (!candidatesResponse.ok) {
      throw new Error(`Candidates API error! status: ${candidatesResponse.status}`);
    }

    const candidatesData = await candidatesResponse.json();
    console.log('✅ Candidates endpoint working');
    console.log('📊 Total candidates in system:', candidatesData.total || 0);
    console.log('📊 Candidates returned:', candidatesData.data?.length || 0);

    // Test 3: Verify AI search results are valid candidate IDs
    if (result.matchedCandidateIds && result.matchedCandidateIds.length > 0) {
      console.log('\n3. Verifying AI search results...');
      
      const availableCandidateIds = candidatesData.data?.map(c => c.id) || [];
      const validMatches = result.matchedCandidateIds.filter(id => 
        availableCandidateIds.includes(id)
      );
      
      console.log('📊 AI search results validation:', {
        totalAiMatches: result.matchedCandidateIds.length,
        validMatches: validMatches.length,
        invalidMatches: result.matchedCandidateIds.length - validMatches.length,
        matchRate: `${((validMatches.length / result.matchedCandidateIds.length) * 100).toFixed(1)}%`
      });

      if (validMatches.length === 0 && result.matchedCandidateIds.length > 0) {
        console.log('⚠️  WARNING: AI search returned candidate IDs that are not in the current candidates list');
        console.log('   This could indicate a filtering issue in the frontend');
      }
    }

    // Test 4: Test empty search query
    console.log('\n4. Testing empty search query...');
    
    const emptyResponse = await fetch('http://localhost:3000/api/ai/search-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '' }),
    });

    if (emptyResponse.status === 400) {
      console.log('✅ Empty query properly rejected (400 status)');
    } else {
      console.log('⚠️  Empty query not properly validated');
    }

    console.log('\n🎉 AI Search Test Complete!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('- AI search API: ✅ Working');
    console.log('- Candidates API: ✅ Working');
    console.log('- AI search validation: ' + (result.matchedCandidateIds && result.matchedCandidateIds.length > 0 ? '✅ Has results' : '⚠️  No results'));
    
    if (result.matchedCandidateIds && result.matchedCandidateIds.length > 0) {
      const availableCandidateIds = candidatesData.data?.map(c => c.id) || [];
      const validMatches = result.matchedCandidateIds.filter(id => 
        availableCandidateIds.includes(id)
      );
      console.log('- Result validation: ' + (validMatches.length > 0 ? '✅ Valid matches' : '⚠️  Invalid matches'));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testAiSearch();
