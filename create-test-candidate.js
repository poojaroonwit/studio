const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestCandidate() {
  console.log('🔍 Creating test candidate...\n');
  
  try {
    // First, let's check if we have any positions
    const positions = await prisma.position.findMany({
      take: 1,
      select: { id: true, title: true }
    });
    
    let positionId = null;
    if (positions.length > 0) {
      positionId = positions[0].id;
      console.log('✅ Using existing position:', positions[0].title);
    } else {
      // Create a test position if none exist
      console.log('📝 Creating test position...');
      const newPosition = await prisma.position.create({
        data: {
          title: 'Software Engineer',
          department: 'Engineering',
          description: 'Test position for candidate modal testing',
          isOpen: true,
          customAttributes: {
            requirements: ['JavaScript', 'React', 'Node.js'],
            responsibilities: ['Develop web applications', 'Collaborate with team'],
            salaryRange: '50000-80000',
            location: 'Remote',
            employmentType: 'Full-time'
          }
        }
      });
      positionId = newPosition.id;
      console.log('✅ Created test position:', newPosition.title);
    }
    
    // Check if we have any candidate sources
    const sources = await prisma.candidateSource.findMany({
      take: 1,
      select: { id: true, name: true }
    });
    
    let sourceId = null;
    if (sources.length > 0) {
      sourceId = sources[0].id;
      console.log('✅ Using existing source:', sources[0].name);
    } else {
      // Create a test source if none exist
      console.log('📝 Creating test candidate source...');
      const newSource = await prisma.candidateSource.create({
        data: {
          name: 'LinkedIn',
          description: 'Professional networking platform',
          logo: 'https://example.com/linkedin-logo.png',
          isActive: true
        }
      });
      sourceId = newSource.id;
      console.log('✅ Created test source:', newSource.name);
    }
    
    // Check if we have any recruitment stages
    const stages = await prisma.recruitmentStage.findMany({
      take: 1,
      select: { id: true, name: true }
    });
    
    let stageId = null;
    if (stages.length > 0) {
      stageId = stages[0].id;
      console.log('✅ Using existing stage:', stages[0].name);
    } else {
      // Create a test stage if none exist
      console.log('📝 Creating test recruitment stage...');
      const newStage = await prisma.recruitmentStage.create({
        data: {
          name: 'Applied',
          description: 'Candidate has applied for the position',
          order: 1,
          isActive: true,
          color: '#3B82F6'
        }
      });
      stageId = newStage.id;
      console.log('✅ Created test stage:', newStage.name);
    }
    
    // Create test candidate
    console.log('📝 Creating test candidate...');
    const testCandidate = await prisma.candidate.create({
      data: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        status: 'Applied',
        positionId: positionId,
        sourceId: sourceId,
        fitScore: 0.85,
        parsedData: {
          personal_info: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890'
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
          skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'PostgreSQL']
        },
        assignmentJustification: ['Strong technical skills', 'Good cultural fit'],
        custom_attributes: {
          linkedin_profile: 'https://linkedin.com/in/johndoe',
          portfolio: 'https://johndoe.dev'
        }
      }
    });
    
    console.log('✅ Test candidate created successfully!');
    console.log('   ID:', testCandidate.id);
    console.log('   Name:', testCandidate.name);
    console.log('   Email:', testCandidate.email);
    console.log('   Status:', testCandidate.status);
    console.log('   Fit Score:', testCandidate.fitScore);
    
    console.log('\n🎉 You can now test the candidate detail modal with this candidate!');
    console.log('   Candidate ID:', testCandidate.id);
    
  } catch (error) {
    console.error('❌ Error creating test candidate:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCandidate();
