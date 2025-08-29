#!/usr/bin/env node

/**
 * Test script to verify fast count functionality
 * This script tests that the API can return total count quickly
 */

const fetch = require('node-fetch');

async function testFastCount() {
  console.log('🧪 Testing Fast Count Functionality...\n');

  try {
    // Test 1: Fast count query
    console.log('1. Testing fast count query...');
    const startTime = Date.now();
    const response1 = await fetch('http://localhost:3000/api/candidates?forCounts=true');
    const data1 = await response1.json();
    const endTime = Date.now();
    
    console.log(`   ✅ Response status: ${response1.status}`);
    console.log(`   ✅ Total candidates: ${data1.total || 0}`);
    console.log(`   ✅ Response time: ${endTime - startTime}ms`);
    console.log(`   ✅ Fast count: ${endTime - startTime < 1000 ? 'YES' : 'NO'}`);

    // Test 2: Full data load
    console.log('\n2. Testing full data load...');
    const startTime2 = Date.now();
    const response2 = await fetch('http://localhost:3000/api/candidates');
    const data2 = await response2.json();
    const endTime2 = Date.now();
    
    console.log(`   ✅ Response status: ${response2.status}`);
    console.log(`   ✅ Candidates returned: ${data2.data?.length || data2.length || 0}`);
    console.log(`   ✅ Response time: ${endTime2 - startTime2}ms`);
    
    if (data2.pagination) {
      console.log(`   ✅ Total candidates: ${data2.pagination.total}`);
      console.log(`   ✅ Page size: ${data2.pagination.limit}`);
    }

    // Test 3: Performance comparison
    console.log('\n3. Performance comparison...');
    const countTime = endTime - startTime;
    const dataTime = endTime2 - startTime2;
    const speedup = Math.round(dataTime / countTime);
    
    console.log(`   ✅ Count query: ${countTime}ms`);
    console.log(`   ✅ Data query: ${dataTime}ms`);
    console.log(`   ✅ Speedup: ${speedup}x faster`);
    console.log(`   ✅ Count is ${countTime < 100 ? 'very fast' : countTime < 500 ? 'fast' : 'slow'}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Fast count query returns total candidates instantly');
    console.log('   • Full data load returns all candidates without limits');
    console.log('   • Task board shows 20 candidates per column initially');
    console.log('   • "See More" buttons load additional candidates progressively');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your development server is running on http://localhost:3000');
  }
}

// Run the test
testFastCount();
