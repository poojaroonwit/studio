const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRecruiterAssignment() {
  console.log('🧪 Testing Recruiter Assignment API...\n');
  
  try {
    // Get a test candidate and recruiter
    const candidate = await prisma.candidate.findFirst({
      where: { recruiterId: null },
      select: { id: true, name: true, email: true }
    });
    
    const recruiter = await prisma.user.findFirst({
      where: { role: 'Recruiter' },
      select: { id: true, name: true, email: true }
    });
    
    if (!candidate) {
      console.log('❌ No candidate without recruiter found for testing');
      return;
    }
    
    if (!recruiter) {
      console.log('❌ No recruiter found for testing');
      return;
    }
    
    console.log(`📋 Test Candidate: ${candidate.name} (${candidate.email})`);
    console.log(`👤 Test Recruiter: ${recruiter.name} (${recruiter.email})`);
    console.log('');
    
    // Test the API endpoint
    const response = await fetch(`http://localhost:3000/api/candidates/${candidate.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You'll need to replace this with a real token
      },
      body: JSON.stringify({
        recruiterId: recruiter.id
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Recruiter assignment successful!');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Recruiter assignment failed');
      console.log('📊 Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRecruiterAssignment();
