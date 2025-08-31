#!/usr/bin/env node

/**
 * Debug script to test candidate loading functionality
 * This script helps identify issues with candidate data loading
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_CANDIDATE_ID = process.argv[2] || '550e8400-e29b-41d4-a716-446655440000'; // Example UUID

async function testCandidateAPI(candidateId) {
  console.log(`🔍 Testing candidate API for ID: ${candidateId}`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('─'.repeat(60));

  const endpoints = [
    `/api/candidates/${candidateId}`,
    `/api/candidates/${candidateId}/comments?limit=5&offset=0`,
    `/api/candidates/${candidateId}/resumes?limit=20&offset=0`
  ];

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`\n📡 Testing: ${endpoint}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Note: This won't work without proper authentication
        // In a real scenario, you'd need to include session cookies
      });
      const endTime = Date.now();
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Time: ${endTime - startTime}ms`);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`   Data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
        } catch (parseError) {
          console.log(`   Parse Error: ${parseError.message}`);
        }
      } else {
        console.log(`   Error: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`   Network Error: ${error.message}`);
    }
  }
}



async function main() {
  console.log('🚀 Candidate Loading Debug Script');
  console.log('='.repeat(60));
  
  // Test API endpoints
  await testCandidateAPI(TEST_CANDIDATE_ID);
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Debug script completed');
     console.log('\n💡 Tips:');
   console.log('   - Check browser console for detailed error messages');
   console.log('   - Ensure you are authenticated and have proper permissions');
   console.log('   - Check network tab for failed API requests');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCandidateAPI };
