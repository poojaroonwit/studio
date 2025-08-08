#!/usr/bin/env node

/**
 * Test script to verify recruiter assignment functionality
 * This script tests the API endpoints for recruiter assignment
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8021';

async function testRecruiterAssignment() {
  console.log('🧪 Testing Recruiter Assignment Functionality...\n');

  try {
    // Test 1: Check if users API returns recruiters
    console.log('1. Testing /api/users?role=Recruiter endpoint...');
    const recruitersResponse = await fetch(`${BASE_URL}/api/users?role=Recruiter`);
    
    if (!recruitersResponse.ok) {
      console.error(`❌ Failed to fetch recruiters: ${recruitersResponse.status} ${recruitersResponse.statusText}`);
      const errorData = await recruitersResponse.text();
      console.error('Error details:', errorData);
      return;
    }
    
    const recruiters = await recruitersResponse.json();
    console.log(`✅ Successfully fetched ${recruiters.length} recruiters`);
    
    if (recruiters.length === 0) {
      console.warn('⚠️  No recruiters found in the system');
      console.log('   This might be why recruiter assignment is not working');
      console.log('   Please ensure there are users with role="Recruiter" in the database');
    } else {
      console.log('   Available recruiters:');
      recruiters.forEach(recruiter => {
        console.log(`   - ${recruiter.name} (${recruiter.email})`);
      });
    }

    // Test 2: Check if candidates API is accessible
    console.log('\n2. Testing /api/candidates endpoint...');
    const candidatesResponse = await fetch(`${BASE_URL}/api/candidates`);
    
    if (!candidatesResponse.ok) {
      console.error(`❌ Failed to fetch candidates: ${candidatesResponse.status} ${candidatesResponse.statusText}`);
      const errorData = await candidatesResponse.text();
      console.error('Error details:', errorData);
      return;
    }
    
    const candidates = await candidatesResponse.json();
    console.log(`✅ Successfully fetched ${candidates.length} candidates`);

    // Test 3: Check if positions API is accessible
    console.log('\n3. Testing /api/positions endpoint...');
    const positionsResponse = await fetch(`${BASE_URL}/api/positions`);
    
    if (!positionsResponse.ok) {
      console.error(`❌ Failed to fetch positions: ${positionsResponse.status} ${positionsResponse.statusText}`);
      const errorData = await positionsResponse.text();
      console.error('Error details:', errorData);
      return;
    }
    
    const positions = await positionsResponse.json();
    console.log(`✅ Successfully fetched ${positions.length} positions`);

    // Test 4: Check if we can update a candidate (if any exist)
    if (candidates.length > 0 && recruiters.length > 0) {
      console.log('\n4. Testing candidate recruiter assignment...');
      const testCandidate = candidates[0];
      const testRecruiter = recruiters[0];
      
      console.log(`   Testing assignment of ${testRecruiter.name} to ${testCandidate.name}...`);
      
      const updateResponse = await fetch(`${BASE_URL}/api/candidates/${testCandidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiterId: testRecruiter.id,
          name: testCandidate.name,
          email: testCandidate.email,
          status: testCandidate.status || 'Applied'
        })
      });
      
      if (!updateResponse.ok) {
        console.error(`❌ Failed to assign recruiter: ${updateResponse.status} ${updateResponse.statusText}`);
        const errorData = await updateResponse.text();
        console.error('Error details:', errorData);
      } else {
        console.log('✅ Successfully assigned recruiter to candidate');
      }
    } else {
      console.log('\n4. Skipping candidate assignment test (no candidates or recruiters available)');
    }

    console.log('\n🎉 Recruiter assignment test completed!');
    
    if (recruiters.length === 0) {
      console.log('\n📝 Recommendations:');
      console.log('   1. Create users with role="Recruiter" in the database');
      console.log('   2. Ensure the users have proper permissions');
      console.log('   3. Check the authentication configuration');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testRecruiterAssignment();
