const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCandidates() {
  console.log('🔍 Testing candidates...\n');
  
  try {
    // Test 1: Check if candidates exist
    console.log('1. Checking candidates in database...');
    const candidates = await prisma.candidate.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true
      }
    });
    
    console.log(`✅ Found ${candidates.length} candidates`);
    
    if (candidates.length > 0) {
      console.log('   First candidate:');
      console.log('   ID:', candidates[0].id);
      console.log('   Name:', candidates[0].name);
      console.log('   Email:', candidates[0].email);
      console.log('   Status:', candidates[0].status);
      
      // Test 2: Test API endpoint
      console.log('\n2. Testing API endpoint...');
      const testCandidateId = candidates[0].id;
      
      // Test with fetch
      const response = await fetch(`http://localhost:8021/api/candidates/${testCandidateId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('   API Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ API call successful');
        console.log('   Candidate name:', data.name);
      } else {
        const errorText = await response.text();
        console.log('   ❌ API call failed');
        console.log('   Error:', errorText);
      }
    } else {
      console.log('   No candidates found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCandidates();
