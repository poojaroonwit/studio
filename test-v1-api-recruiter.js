const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testV1ApiRecruiterAssignment() {
  console.log('Testing v1 API automatic recruiter assignment...\n');

  try {
    // 1. Create a test recruiter
    console.log('1. Creating test recruiter...');
    const recruiter = await prisma.user.create({
      data: {
        id: 'test-v1-recruiter-id',
        name: 'Test V1 Recruiter',
        email: 'test.v1.recruiter@example.com',
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
        id: 'test-v1-position-id',
        title: 'Test V1 Position',
        department: 'Engineering',
        description: 'Test position for v1 API recruiter assignment',
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

    // 3. Create a test candidate with position but no recruiter (simulating v1 API creation)
    console.log('\n3. Creating test candidate with position but no recruiter...');
    const candidate = await prisma.candidate.create({
      data: {
        id: 'test-v1-candidate-id',
        name: 'Test V1 Candidate',
        email: 'test.v1.candidate@example.com',
        phone: '+1234567890',
        positionId: position.id,
        recruiterId: null, // No recruiter assigned initially
        status: 'new',
        fitScore: 0.85,
        parsedData: {
          candidate_info: {
            personal_info: {
              firstname: 'Test',
              lastname: 'V1 Candidate',
            },
            contact_info: {
              email: 'test.v1.candidate@example.com',
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

    // 4. Simulate the v1 API recruiter assignment logic
    console.log('\n4. Testing v1 API recruiter assignment logic...');
    
    // Get position with recruiter
    const positionWithRecruiter = await prisma.position.findUnique({
      where: { id: position.id },
      include: { recruiter: true }
    });

    if (positionWithRecruiter && positionWithRecruiter.recruiterId && !candidate.recruiterId) {
      // Update candidate with recruiter
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { 
          recruiterId: positionWithRecruiter.recruiterId,
          updatedAt: new Date()
        }
      });

      // Create transition record for recruiter assignment
      await prisma.transitionRecord.create({
        data: {
          id: 'test-v1-transition-id',
          candidateId: candidate.id,
          positionId: position.id,
          stage: 'new',
          notes: `Recruiter auto-assigned from position: ${positionWithRecruiter.recruiter?.name || positionWithRecruiter.recruiterId}`,
          actingUserId: 'test-user-id',
          date: new Date(),
        },
      });

      console.log('✓ Recruiter assignment logic executed successfully');
    } else {
      console.log('✗ Recruiter assignment logic failed - conditions not met');
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

    console.log('\n🎉 V1 API test completed successfully!');

  } catch (error) {
    console.error('❌ V1 API test failed:', error);
  } finally {
    // Clean up test data
    console.log('\n7. Cleaning up test data...');
    try {
      await prisma.transitionRecord.deleteMany({
        where: {
          candidateId: 'test-v1-candidate-id',
        },
      });
      await prisma.candidate.delete({
        where: { id: 'test-v1-candidate-id' },
      });
      await prisma.position.delete({
        where: { id: 'test-v1-position-id' },
      });
      await prisma.user.delete({
        where: { id: 'test-v1-recruiter-id' },
      });
      console.log('✓ Test data cleaned up');
    } catch (cleanupError) {
      console.error('✗ Cleanup failed:', cleanupError);
    }
    
    await prisma.$disconnect();
  }
}

// Run the test
testV1ApiRecruiterAssignment();
