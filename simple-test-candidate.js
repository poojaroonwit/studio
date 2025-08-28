const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSimpleTestCandidate() {
  console.log('🔍 Creating simple test candidate...\n');
  
  try {
    // Check existing candidates
    const existingCandidates = await prisma.candidate.count();
    console.log(`Current candidates in database: ${existingCandidates}`);
    
    if (existingCandidates > 0) {
      console.log('✅ Candidates already exist in database');
      const candidates = await prisma.candidate.findMany({
        take: 1,
        select: { id: true, name: true, email: true }
      });
      console.log('First candidate:', candidates[0]);
      return;
    }
    
    // Create a simple position first
    console.log('📝 Creating simple position...');
    const position = await prisma.position.create({
      data: {
        title: 'Test Position',
        department: 'Test Department',
        description: 'Test position for modal testing'
      }
    });
    console.log('✅ Position created:', position.id);
    
    // Create a simple candidate
    console.log('📝 Creating simple candidate...');
    const candidate = await prisma.candidate.create({
      data: {
        name: 'Test Candidate',
        email: 'test@example.com',
        phone: '+1234567890',
        status: 'Applied',
        positionId: position.id,
        fitScore: 0.75
      }
    });
    
    console.log('✅ Test candidate created successfully!');
    console.log('   ID:', candidate.id);
    console.log('   Name:', candidate.name);
    console.log('   Email:', candidate.email);
    console.log('   Status:', candidate.status);
    
    console.log('\n🎉 You can now test the candidate detail modal!');
    console.log('   Candidate ID:', candidate.id);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSimpleTestCandidate();
