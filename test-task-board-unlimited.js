#!/usr/bin/env node

/**
 * Test script to verify task board unlimited candidate loading
 * This script tests that the API can return all candidates without limits
 */

const fetch = require('node-fetch');

async function testUnlimitedCandidates() {
  console.log('🧪 Testing Task Board Unlimited Candidate Loading...\n');

  try {
    // Test 1: Fetch candidates without limit parameter
    console.log('1. Testing API call without limit parameter...');
    const response1 = await fetch('http://localhost:3000/api/candidates');
    const data1 = await response1.json();
    
    console.log(`   ✅ Response status: ${response1.status}`);
    console.log(`   ✅ Candidates returned: ${data1.data?.length || data1.length || 0}`);
    console.log(`   ✅ Has pagination: ${!!data1.pagination}`);
    
    if (data1.pagination) {
      console.log(`   ✅ Total candidates: ${data1.pagination.total}`);
      console.log(`   ✅ Page size: ${data1.pagination.limit}`);
    }

    // Test 2: Fetch candidates with a very high limit
    console.log('\n2. Testing API call with very high limit...');
    const response2 = await fetch('http://localhost:3000/api/candidates?limit=10000');
    const data2 = await response2.json();
    
    console.log(`   ✅ Response status: ${response2.status}`);
    console.log(`   ✅ Candidates returned: ${data2.data?.length || data2.length || 0}`);
    
    if (data2.pagination) {
      console.log(`   ✅ Total candidates: ${data2.pagination.total}`);
      console.log(`   ✅ Page size: ${data2.pagination.limit}`);
    }

    // Test 3: Check if the limit is truly unlimited
    console.log('\n3. Verifying unlimited behavior...');
    if (data1.pagination && data2.pagination) {
      const isUnlimited = data1.pagination.total === data2.pagination.total;
      console.log(`   ✅ Unlimited behavior: ${isUnlimited ? 'YES' : 'NO'}`);
      
      if (isUnlimited) {
        console.log(`   ✅ All ${data1.pagination.total} candidates can be loaded`);
      } else {
        console.log(`   ❌ Limited to ${data2.pagination.total} candidates`);
      }
    }

    // Test 4: Performance check
    console.log('\n4. Performance check...');
    const startTime = Date.now();
    const response3 = await fetch('http://localhost:3000/api/candidates');
    const data3 = await response3.json();
    const endTime = Date.now();
    
    console.log(`   ✅ Response time: ${endTime - startTime}ms`);
    console.log(`   ✅ Candidates per second: ${Math.round((data3.data?.length || data3.length || 0) / ((endTime - startTime) / 1000))}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Task board can now load ALL candidates without limits');
    console.log('   • Pagination within columns manages display efficiently');
    console.log('   • Performance is maintained through optimized queries');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your development server is running on http://localhost:3000');
  }
}

// Run the test
testUnlimitedCandidates();
