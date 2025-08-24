const { Pool } = require('pg');
require('dotenv').config();

async function createTestCandidates() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🧪 Creating test candidates with JobMatch data for fit score filtering...');

    // Get a recruiter user
    const userResult = await pool.query('SELECT id, name FROM "User" WHERE role = $1 LIMIT 1', ['Recruiter']);
    const recruiter = userResult.rows[0];

    if (!recruiter) {
      console.log('❌ No recruiter found. Please create a recruiter user first.');
      return;
    }

    // Create test positions
    const positions = [
      { id: '550e8400-e29b-41d4-a716-446655440101', title: 'Senior React Developer', department: 'Engineering' },
      { id: '550e8400-e29b-41d4-a716-446655440102', title: 'Python Backend Developer', department: 'Engineering' },
      { id: '550e8400-e29b-41d4-a716-446655440103', title: 'Product Manager', department: 'Product' },
    ];

    for (const position of positions) {
      try {
        await pool.query(`
          INSERT INTO "Position" (id, title, department, "isOpen", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, true, NOW(), NOW())
        `, [position.id, position.title, position.department]);
      } catch (error) {
        if (error.code !== '23505') { // Ignore unique constraint violations
          throw error;
        }
      }
    }

    // Create test candidates with different fit scores
    const testCandidates = [
      {
        id: '550e8400-e29b-41d4-a716-446655440201',
        name: 'John Smith',
        email: 'john.smith@test.com',
        fitScore: 85, // A grade (81-100)
        positionId: '550e8400-e29b-41d4-a716-446655440101',
        status: 'Applied'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440202',
        name: 'Jane Doe',
        email: 'jane.doe@test.com',
        fitScore: 75, // B grade (61-80)
        positionId: '550e8400-e29b-41d4-a716-446655440102',
        status: 'Screening'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440203',
        name: 'Bob Johnson',
        email: 'bob.johnson@test.com',
        fitScore: 55, // C grade (41-60)
        positionId: '550e8400-e29b-41d4-a716-446655440103',
        status: 'Shortlisted'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440204',
        name: 'Alice Brown',
        email: 'alice.brown@test.com',
        fitScore: 35, // D grade (21-40)
        positionId: '550e8400-e29b-41d4-a716-446655440101',
        status: 'Applied'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440205',
        name: 'Charlie Wilson',
        email: 'charlie.wilson@test.com',
        fitScore: 15, // E grade (0-20)
        positionId: '550e8400-e29b-41d4-a716-446655440102',
        status: 'Applied'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440206',
        name: 'Diana Davis',
        email: 'diana.davis@test.com',
        fitScore: null, // No score
        positionId: null,
        status: 'Applied'
      }
    ];

    // Insert candidates
    for (const candidate of testCandidates) {
      try {
        await pool.query(`
          INSERT INTO "Candidate" (id, name, email, "fitScore", "positionId", status, "recruiterId", "applicationDate", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
        `, [candidate.id, candidate.name, candidate.email, candidate.fitScore, candidate.positionId, candidate.status, recruiter.id]);
      } catch (error) {
        if (error.code !== '23505') { // Ignore unique constraint violations
          throw error;
        }
      }
    }

    // Create JobMatch records for matching fit score testing
    const jobMatches = [
      // Candidate 1 - High matching scores
      { candidateId: '550e8400-e29b-41d4-a716-446655440201', jobId: '550e8400-e29b-41d4-a716-446655440101', fitScore: 0.85, jobTitle: 'Senior React Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440201', jobId: '550e8400-e29b-41d4-a716-446655440102', fitScore: 0.75, jobTitle: 'Python Backend Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440201', jobId: '550e8400-e29b-41d4-a716-446655440103', fitScore: 0.65, jobTitle: 'Product Manager' },
      
      // Candidate 2 - Medium matching scores
      { candidateId: '550e8400-e29b-41d4-a716-446655440202', jobId: '550e8400-e29b-41d4-a716-446655440101', fitScore: 0.70, jobTitle: 'Senior React Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440202', jobId: '550e8400-e29b-41d4-a716-446655440102', fitScore: 0.75, jobTitle: 'Python Backend Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440202', jobId: '550e8400-e29b-41d4-a716-446655440103', fitScore: 0.60, jobTitle: 'Product Manager' },
      
      // Candidate 3 - Low matching scores
      { candidateId: '550e8400-e29b-41d4-a716-446655440203', jobId: '550e8400-e29b-41d4-a716-446655440101', fitScore: 0.45, jobTitle: 'Senior React Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440203', jobId: '550e8400-e29b-41d4-a716-446655440102', fitScore: 0.55, jobTitle: 'Python Backend Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440203', jobId: '550e8400-e29b-41d4-a716-446655440103', fitScore: 0.65, jobTitle: 'Product Manager' },
      
      // Candidate 4 - Very low matching scores
      { candidateId: '550e8400-e29b-41d4-a716-446655440204', jobId: '550e8400-e29b-41d4-a716-446655440101', fitScore: 0.25, jobTitle: 'Senior React Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440204', jobId: '550e8400-e29b-41d4-a716-446655440102', fitScore: 0.35, jobTitle: 'Python Backend Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440204', jobId: '550e8400-e29b-41d4-a716-446655440103', fitScore: 0.30, jobTitle: 'Product Manager' },
      
      // Candidate 5 - Extremely low matching scores
      { candidateId: '550e8400-e29b-41d4-a716-446655440205', jobId: '550e8400-e29b-41d4-a716-446655440101', fitScore: 0.10, jobTitle: 'Senior React Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440205', jobId: '550e8400-e29b-41d4-a716-446655440102', fitScore: 0.15, jobTitle: 'Python Backend Developer' },
      { candidateId: '550e8400-e29b-41d4-a716-446655440205', jobId: '550e8400-e29b-41d4-a716-446655440103', fitScore: 0.05, jobTitle: 'Product Manager' },
      
      // Candidate 6 - No job matches (for testing "no-score" filter)
    ];

    // Insert JobMatch records
    for (const match of jobMatches) {
      try {
        await pool.query(`
          INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "jobTitle", "matchReasons", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
        `, [match.candidateId, match.jobId, match.fitScore, match.jobTitle, ['Test match reason']]);
      } catch (error) {
        if (error.code !== '23505') { // Ignore unique constraint violations
          throw error;
        }
      }
    }

    console.log('✅ Test candidates created successfully!');
    console.log('📊 Test data summary:');
    console.log('- 6 candidates with different fit scores (A, B, C, D, E, and no-score grades)');
    console.log('- 15 JobMatch records for testing matching fit score filtering');
    console.log('- 3 test positions');
    console.log('');
    console.log('🎯 You can now test horizontal fit score filtering:');
    console.log('- Applied Job Fit Score: Uses candidate.fitScore field');
    console.log('- Matching Job Fit Score: Uses JobMatch.fitScore field');
    console.log('- Try filtering by different grade ranges (A, B, C, D, E, no-score)');

  } catch (error) {
    console.error('❌ Error creating test candidates:', error);
  } finally {
    await pool.end();
  }
}

createTestCandidates();
