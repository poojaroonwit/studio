const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRecruiterAssignment() {
  console.log('Testing automatic recruiter assignment...\n');

  try {
    // 1. Create a test recruiter
    console.log('1. Creating test recruiter...');
    const recruiter = await prisma.user.create({
      data: {
        id: 'test-recruiter-id',
        name: 'Test Recruiter',
        email: 'test.recruiter@example.com',
        role: 'Recruiter',
        modulePermissions: ['CANDIDATES_MANAGE'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✓ Test recruiter created:', recruiter.name);

    // 2. Create a test position with the recruiter
    console.log('\n2. Creating test position with recruiter...');
    const position = await prisma.position.create({
      data: {
        id: 'test-position-id',
        title: 'Test Position',
        department: 'Engineering',
        description: 'Test position for recruiter assignment',
        recruiterId: recruiter.id,
        isOpen: true,
        positionLevel: 'Mid-level',
        matchCriteria: {},
        customAttributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✓ Test position created:', position.title, 'with recruiter:', recruiter.name);

    // 3. Create a test candidate without recruiter but with position
    console.log('\n3. Creating test candidate with position but no recruiter...');
    const candidate = await prisma.candidate.create({
      data: {
        id: 'test-candidate-id',
        name: 'Test Candidate',
        email: 'test.candidate@example.com',
        phone: '+1234567890',
        positionId: position.id,
        recruiterId: null, // No recruiter assigned
        status: 'new',
        fitScore: 0.85,
        parsedData: {
          candidate_info: {
            personal_info: {
              firstname: 'Test',
              lastname: 'Candidate',
            },
            contact_info: {
              email: 'test.candidate@example.com',
              phone: '+1234567890',
            },
          },
        },
        applicationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✓ Test candidate created:', candidate.name, 'with position:', position.title, 'but no recruiter');

    // 4. Test the syncRecruiterForCandidate function
    console.log('\n4. Testing automatic recruiter assignment...');
    const { syncRecruiterForCandidate } = require('./src/lib/recruiterSync');
    
    const syncResult = await syncRecruiterForCandidate(
      candidate.id,
      position.id,
      'test-user-id',
      'Test User'
    );
    
    if (syncResult) {
      console.log('✓ Recruiter assignment successful');
    } else {
      console.log('✗ Recruiter assignment failed');
    }

    // 5. Verify the candidate now has a recruiter
    console.log('\n5. Verifying recruiter assignment...');
    const updatedCandidate = await prisma.candidate.findUnique({
      where: { id: candidate.id },
      include: {
        recruiter: true,
        position: true,
      },
    });

    if (updatedCandidate.recruiterId === recruiter.id) {
      console.log('✓ Candidate successfully assigned to recruiter:', updatedCandidate.recruiter.name);
    } else {
      console.log('✗ Candidate recruiter assignment failed. Expected:', recruiter.id, 'Got:', updatedCandidate.recruiterId);
    }

    // 6. Check transition record
    console.log('\n6. Checking transition record...');
    const transitionRecord = await prisma.transitionRecord.findFirst({
      where: {
        candidateId: candidate.id,
        notes: {
          contains: 'Recruiter auto-assigned'
        },
      },
    });

    if (transitionRecord) {
      console.log('✓ Transition record created:', transitionRecord.notes);
    } else {
      console.log('✗ No transition record found for recruiter assignment');
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    console.log('\n7. Cleaning up test data...');
    try {
      await prisma.transitionRecord.deleteMany({
        where: {
          candidateId: 'test-candidate-id',
        },
      });
      await prisma.candidate.delete({
        where: { id: 'test-candidate-id' },
      });
      await prisma.position.delete({
        where: { id: 'test-position-id' },
      });
      await prisma.user.delete({
        where: { id: 'test-recruiter-id' },
      });
      console.log('✓ Test data cleaned up');
    } catch (cleanupError) {
      console.error('✗ Cleanup failed:', cleanupError);
    }
    
    await prisma.$disconnect();
  }
}

// Run the test
testRecruiterAssignment();
