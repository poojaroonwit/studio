const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCandidateModal() {
  console.log('🔧 Fixing candidate modal issue...\n');
  
  try {
    // Check if candidates exist
    const candidateCount = await prisma.candidate.count();
    console.log(`Current candidates in database: ${candidateCount}`);
    
    if (candidateCount === 0) {
      console.log('📝 No candidates found. Creating a test candidate...');
      
      // Create a simple position first
      const position = await prisma.position.create({
        data: {
          title: 'Software Engineer',
          department: 'Engineering',
          description: 'Test position for modal testing'
        }
      });
      console.log('✅ Position created:', position.id);
      
      // Create a test candidate
      const candidate = await prisma.candidate.create({
        data: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          status: 'Applied',
          positionId: position.id,
          fitScore: 0.85,
          parsedData: {
            personal_info: {
              name: 'John Doe',
              email: 'john.doe@example.com'
            },
            education: [
              {
                degree: 'Bachelor of Science',
                field: 'Computer Science',
                institution: 'University of Technology',
                year: '2020'
              }
            ],
            experience: [
              {
                title: 'Software Developer',
                company: 'Tech Corp',
                duration: '2 years',
                description: 'Developed web applications using React and Node.js'
              }
            ],
            skills: ['JavaScript', 'React', 'Node.js', 'TypeScript']
          }
        }
      });
      
      console.log('✅ Test candidate created successfully!');
      console.log('   ID:', candidate.id);
      console.log('   Name:', candidate.name);
      console.log('   Email:', candidate.email);
      
      console.log('\n🎉 Now you can test the candidate detail modal!');
      console.log('   Use this candidate ID to test the modal:', candidate.id);
      
    } else {
      console.log('✅ Candidates already exist in database');
      const candidates = await prisma.candidate.findMany({
        take: 3,
        select: { id: true, name: true, email: true }
      });
      
      console.log('Available candidates:');
      candidates.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (${c.email}) - ID: ${c.id}`);
      });
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Go to your application');
    console.log('2. Navigate to a page that shows candidates (like positions or dashboard)');
    console.log('3. Click on a candidate to open the detail modal');
    console.log('4. The modal should now load properly with candidate data');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixCandidateModal();
