#!/usr/bin/env node

/**
 * Test script for recruiter synchronization functionality
 * This script tests the recruiter sync API endpoints
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testRecruiterSync() {
  console.log('🧪 Testing Recruiter Sync Functionality\n');

  try {
    // Test 1: Sync all recruiters
    console.log('1. Testing bulk sync all recruiters...');
    const bulkSyncResponse = await fetch(`${BASE_URL}/api/settings/recruiter-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncAll: true }),
      credentials: 'include',
    });

    if (bulkSyncResponse.ok) {
      const bulkSyncData = await bulkSyncResponse.json();
      console.log('✅ Bulk sync successful');
      console.log(`   - Total positions: ${bulkSyncData.summary.totalPositions}`);
      console.log(`   - Candidates updated: ${bulkSyncData.summary.totalCandidatesUpdated}`);
      console.log(`   - Candidates skipped: ${bulkSyncData.summary.totalCandidatesSkipped}`);
      console.log(`   - Errors: ${bulkSyncData.summary.totalErrors}`);
    } else {
      const errorData = await bulkSyncResponse.json();
      console.log(`❌ Bulk sync failed: ${errorData.message}`);
    }

    // Test 2: Sync specific position (if we have position IDs)
    console.log('\n2. Testing position-specific sync...');
    const positionsResponse = await fetch(`${BASE_URL}/api/positions/all`);
    
    if (positionsResponse.ok) {
      const positions = await positionsResponse.json();
      if (positions.length > 0) {
        const firstPosition = positions[0];
        console.log(`   Testing with position: ${firstPosition.title} (${firstPosition.id})`);
        
        const positionSyncResponse = await fetch(`${BASE_URL}/api/settings/recruiter-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positionId: firstPosition.id }),
          credentials: 'include',
        });

        if (positionSyncResponse.ok) {
          const positionSyncData = await positionSyncResponse.json();
          console.log('✅ Position sync successful');
          console.log(`   - Position: ${positionSyncData.result.positionTitle}`);
          console.log(`   - Candidates updated: ${positionSyncData.result.candidatesUpdated}`);
          console.log(`   - Candidates skipped: ${positionSyncData.result.candidatesSkipped}`);
        } else {
          const errorData = await positionSyncResponse.json();
          console.log(`❌ Position sync failed: ${errorData.message}`);
        }
      } else {
        console.log('   No positions found to test with');
      }
    } else {
      console.log('   Failed to fetch positions for testing');
    }

    // Test 3: Test invalid request
    console.log('\n3. Testing invalid request...');
    const invalidResponse = await fetch(`${BASE_URL}/api/settings/recruiter-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });

    if (invalidResponse.status === 400) {
      console.log('✅ Invalid request properly rejected');
    } else {
      console.log(`❌ Invalid request not properly handled: ${invalidResponse.status}`);
    }

    console.log('\n🎉 Recruiter sync tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRecruiterSync();
}

module.exports = { testRecruiterSync };
