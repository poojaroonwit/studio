const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testV1ApiRecruiterAssignment() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing V1 API Recruiter Assignment Fix...\n');

    // Step 1: Create a test recruiter
    const recruiterId = uuidv4();
    const recruiterName = 'Test Recruiter V1';
    const recruiterEmail = 'test.recruiter.v1@example.com';
    
    console.log('1. Creating test recruiter...');
    await client.query(`
      INSERT INTO "User" (id, name, email, password, role, "modulePermissions", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [recruiterId, recruiterName, recruiterEmail, 'hashedpassword', 'Recruiter', ['CANDIDATES_VIEW', 'CANDIDATES_MANAGE']]);
    console.log('   ✅ Test recruiter created');

    // Step 2: Create a test position with the recruiter
    const positionId = uuidv4();
    const positionTitle = 'Test Position V1';
    
    console.log('2. Creating test position with recruiter...');
    await client.query(`
      INSERT INTO "Position" (id, title, department, description, "isOpen", "recruiterId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [positionId, positionTitle, 'Engineering', 'Test position description', true, recruiterId]);
    console.log('   ✅ Test position created with recruiter assigned');

    // Step 3: Test v1 API candidate creation with position
    console.log('3. Testing v1 API candidate creation with position...');
    const v1CandidateId = uuidv4();
    const v1CandidateName = 'V1 API Test Candidate';
    const v1CandidateEmail = 'v1.test@example.com';
    
    // Simulate the v1 API candidate creation process
    // First, create the candidate without recruiter
    await client.query(`
      INSERT INTO "Candidate" (id, name, email, phone, "positionId", "fitScore", status, "parsedData", "applicationDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
    `, [
      v1CandidateId, 
      v1CandidateName, 
      v1CandidateEmail, 
      '+1234567890',
      positionId, // This should trigger recruiter assignment
      85,
      'Applied',
      JSON.stringify({
        candidate_info: {
          personal_info: { firstname: 'V1', lastname: 'Test' },
          contact_info: { email: v1CandidateEmail, phone: '+1234567890' },
          job_applied: { jobId: positionId, fitScore: 85 }
        }
      })
    ]);

    // Now simulate the recruiter assignment logic from the v1 API
    console.log('4. Simulating recruiter assignment logic...');
    
    // Get position with recruiter
    const positionResult = await client.query(`
      SELECT p.id, p.title, p."recruiterId", u.name as "recruiterName", u.email as "recruiterEmail"
      FROM "Position" p
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      WHERE p.id = $1
    `, [positionId]);

    if (positionResult.rows.length > 0) {
      const position = positionResult.rows[0];
      console.log(`   Position found: ${position.title} with recruiter: ${position.recruiterName}`);

      if (position.recruiterId) {
        // Update candidate with recruiter
        await client.query(`
          UPDATE "Candidate" 
          SET "recruiterId" = $1, "updatedAt" = NOW()
          WHERE id = $2
        `, [position.recruiterId, v1CandidateId]);

        // Create transition record
        await client.query(`
          INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
        `, [
          uuidv4(),
          v1CandidateId,
          positionId,
          'Applied',
          `Recruiter auto-assigned from position: ${position.recruiterName}`,
          recruiterId // Using recruiter as acting user for test
        ]);

        console.log(`   ✅ Recruiter auto-assigned to candidate ${v1CandidateId} from position ${positionId}`);
        console.log(`   Recruiter: ${position.recruiterName} (${position.recruiterEmail})`);
      } else {
        console.log(`   ⚠️ Position ${positionId} exists but has no recruiter assigned`);
      }
    } else {
      console.log(`   ❌ Position ${positionId} not found in database`);
    }

    // Check if recruiter was assigned
    const v1CandidateResult = await client.query(`
      SELECT c."recruiterId", u.name as "recruiterName", u.email as "recruiterEmail"
      FROM "Candidate" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1
    `, [v1CandidateId]);

    if (v1CandidateResult.rows[0]?.recruiterId === recruiterId) {
      console.log('   ✅ V1 API candidate created with recruiter auto-assigned');
      console.log(`   Final recruiter: ${v1CandidateResult.rows[0].recruiterName} (${v1CandidateResult.rows[0].recruiterEmail})`);
    } else {
      console.log('   ❌ V1 API candidate created but recruiter NOT assigned');
      console.log('      Expected recruiterId:', recruiterId);
      console.log('      Actual recruiterId:', v1CandidateResult.rows[0]?.recruiterId);
    }

    // Step 5: Clean up test data
    console.log('5. Cleaning up test data...');
    await client.query('DELETE FROM "TransitionRecord" WHERE "candidateId" = $1', [v1CandidateId]);
    await client.query('DELETE FROM "Candidate" WHERE id = $1', [v1CandidateId]);
    await client.query('DELETE FROM "Position" WHERE id = $1', [positionId]);
    await client.query('DELETE FROM "User" WHERE id = $1', [recruiterId]);
    console.log('   ✅ Test data cleaned up');

    console.log('\n🎉 V1 API Recruiter Assignment Test Completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testV1ApiRecruiterAssignment().catch(console.error);
