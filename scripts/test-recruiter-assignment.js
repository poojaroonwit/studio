const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testRecruiterAssignment() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Recruiter Assignment Functionality...\n');

    // Step 1: Create a test recruiter
    const recruiterId = uuidv4();
    const recruiterName = 'Test Recruiter';
    const recruiterEmail = 'test.recruiter@example.com';
    
    console.log('1. Creating test recruiter...');
    await client.query(`
      INSERT INTO "User" (id, name, email, password, role, "modulePermissions", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [recruiterId, recruiterName, recruiterEmail, 'hashedpassword', 'Recruiter', ['CANDIDATES_VIEW', 'CANDIDATES_MANAGE']]);
    console.log('   ✅ Test recruiter created');

    // Step 2: Create a test position with the recruiter
    const positionId = uuidv4();
    const positionTitle = 'Test Position';
    
    console.log('2. Creating test position with recruiter...');
    await client.query(`
      INSERT INTO "Position" (id, title, department, description, "isOpen", "recruiterId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [positionId, positionTitle, 'Engineering', 'Test position description', true, recruiterId]);
    console.log('   ✅ Test position created with recruiter assigned');

    // Step 3: Test v1 API candidate creation with position
    console.log('3. Testing v1 API candidate creation...');
    const v1CandidateId = uuidv4();
    const v1CandidateName = 'V1 API Test Candidate';
    const v1CandidateEmail = 'v1.test@example.com';
    
    // Create candidate via v1 API structure
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

    // Check if recruiter was assigned
    const v1CandidateResult = await client.query(`
      SELECT c."recruiterId", u.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1
    `, [v1CandidateId]);

    if (v1CandidateResult.rows[0]?.recruiterId === recruiterId) {
      console.log('   ✅ V1 API candidate created with recruiter auto-assigned');
    } else {
      console.log('   ❌ V1 API candidate created but recruiter NOT assigned');
      console.log('      Expected recruiterId:', recruiterId);
      console.log('      Actual recruiterId:', v1CandidateResult.rows[0]?.recruiterId);
    }

    // Step 4: Test manual candidate creation with position
    console.log('4. Testing manual candidate creation...');
    const manualCandidateId = uuidv4();
    const manualCandidateName = 'Manual Test Candidate';
    const manualCandidateEmail = 'manual.test@example.com';
    
    // Create candidate via manual creation structure
    await client.query(`
      INSERT INTO "Candidate" (id, name, email, phone, "positionId", "fitScore", status, "parsedData", "applicationDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
    `, [
      manualCandidateId, 
      manualCandidateName, 
      manualCandidateEmail, 
      '+1234567891',
      positionId, // This should trigger recruiter assignment
      90,
      'Applied',
      JSON.stringify({
        candidate_info: {
          personal_info: { firstname: 'Manual', lastname: 'Test' },
          contact_info: { email: manualCandidateEmail, phone: '+1234567891' }
        },
        job_applied: { jobId: positionId, fitScore: 90 }
      })
    ]);

    // Check if recruiter was assigned
    const manualCandidateResult = await client.query(`
      SELECT c."recruiterId", u.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.id = $1
    `, [manualCandidateId]);

    if (manualCandidateResult.rows[0]?.recruiterId === recruiterId) {
      console.log('   ✅ Manual candidate created with recruiter auto-assigned');
    } else {
      console.log('   ❌ Manual candidate created but recruiter NOT assigned');
      console.log('      Expected recruiterId:', recruiterId);
      console.log('      Actual recruiterId:', manualCandidateResult.rows[0]?.recruiterId);
    }

    // Step 5: Test candidate without position (should not assign recruiter)
    console.log('5. Testing candidate without position...');
    const noPositionCandidateId = uuidv4();
    const noPositionCandidateName = 'No Position Test Candidate';
    const noPositionCandidateEmail = 'noposition.test@example.com';
    
    await client.query(`
      INSERT INTO "Candidate" (id, name, email, phone, "positionId", "fitScore", status, "parsedData", "applicationDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
    `, [
      noPositionCandidateId, 
      noPositionCandidateName, 
      noPositionCandidateEmail, 
      '+1234567892',
      null, // No position
      75,
      'Applied',
      JSON.stringify({
        candidate_info: {
          personal_info: { firstname: 'NoPosition', lastname: 'Test' },
          contact_info: { email: noPositionCandidateEmail, phone: '+1234567892' }
        }
      })
    ]);

    // Check that no recruiter was assigned
    const noPositionCandidateResult = await client.query(`
      SELECT c."recruiterId"
      FROM "Candidate" c
      WHERE c.id = $1
    `, [noPositionCandidateId]);

    if (noPositionCandidateResult.rows[0]?.recruiterId === null) {
      console.log('   ✅ Candidate without position correctly has no recruiter assigned');
    } else {
      console.log('   ❌ Candidate without position incorrectly has recruiter assigned');
      console.log('      Expected recruiterId: null');
      console.log('      Actual recruiterId:', noPositionCandidateResult.rows[0]?.recruiterId);
    }

    // Step 6: Clean up test data
    console.log('6. Cleaning up test data...');
    await client.query('DELETE FROM "Candidate" WHERE id IN ($1, $2, $3)', [v1CandidateId, manualCandidateId, noPositionCandidateId]);
    await client.query('DELETE FROM "Position" WHERE id = $1', [positionId]);
    await client.query('DELETE FROM "User" WHERE id = $1', [recruiterId]);
    console.log('   ✅ Test data cleaned up');

    console.log('\n🎉 Recruiter Assignment Test Completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testRecruiterAssignment().catch(console.error);
