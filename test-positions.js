const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPositions() {
  console.log('🔍 Testing positions...\n');
  
  try {
    // Test 1: Check if positions exist
    console.log('1. Checking positions in database...');
    const positions = await prisma.position.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        department: true,
        isOpen: true,
        createdAt: true
      }
    });
    
    console.log(`✅ Found ${positions.length} positions`);
    
    if (positions.length > 0) {
      console.log('   First position:');
      console.log('   ID:', positions[0].id);
      console.log('   Title:', positions[0].title);
      console.log('   Department:', positions[0].department);
      console.log('   Is Open:', positions[0].isOpen);
    } else {
      console.log('   No positions found in database');
    }
    
    // Test 2: Check other related tables
    console.log('\n2. Checking other tables...');
    
    const sources = await prisma.candidateSource.count();
    console.log('   Candidate Sources:', sources);
    
    const stages = await prisma.recruitmentStage.count();
    console.log('   Recruitment Stages:', stages);
    
    const users = await prisma.user.count();
    console.log('   Users:', users);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPositions();
