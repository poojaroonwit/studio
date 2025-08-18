const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testCandidates() {
  console.log('Testing candidates and positions...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');

    // Check if tables exist
    console.log('\n🔍 Checking tables...');
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Candidate', 'Position', 'JobMatch')
      ORDER BY table_name;
    `);
    
    console.log('📋 Available tables:');
    tablesCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Count candidates
    console.log('\n🔍 Counting candidates...');
    const candidatesCount = await client.query('SELECT COUNT(*) as count FROM "Candidate"');
    console.log(`📊 Total candidates: ${candidatesCount.rows[0].count}`);

    // Count positions
    console.log('\n🔍 Counting positions...');
    const positionsCount = await client.query('SELECT COUNT(*) as count FROM "Position"');
    console.log(`📊 Total positions: ${positionsCount.rows[0].count}`);

    // Count job matches
    console.log('\n🔍 Counting job matches...');
    const jobMatchesCount = await client.query('SELECT COUNT(*) as count FROM "JobMatch"');
    console.log(`📊 Total job matches: ${jobMatchesCount.rows[0].count}`);

    // Show candidates with their position assignments
    console.log('\n🔍 Candidates with position assignments...');
    const candidatesWithPositions = await client.query(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c."positionId",
        c.status,
        c."applicationDate",
        p.title as "positionTitle"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      ORDER BY c."applicationDate" DESC
      LIMIT 10;
    `);
    
    console.log('📋 Recent candidates:');
    candidatesWithPositions.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.email})`);
      console.log(`    Position: ${row.positionTitle || 'None'} (ID: ${row.positionId || 'None'})`);
      console.log(`    Status: ${row.status}, Applied: ${row.applicationDate}`);
      console.log('');
    });

    // Show positions
    console.log('\n🔍 Available positions...');
    const positions = await client.query(`
      SELECT 
        id,
        title,
        department,
        "isOpen",
        "createdAt"
      FROM "Position"
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    
    console.log('📋 Recent positions:');
    positions.rows.forEach(row => {
      console.log(`  - ${row.title} (${row.department})`);
      console.log(`    ID: ${row.id}, Open: ${row.isOpen}, Created: ${row.createdAt}`);
      console.log('');
    });

    // Show job matches
    console.log('\n🔍 Job matches...');
    const jobMatches = await client.query(`
      SELECT 
        jm.id,
        jm."candidateId",
        jm."jobId",
        jm."jobTitle",
        jm."fitScore",
        c.name as "candidateName",
        c.email as "candidateEmail",
        p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Candidate" c ON jm."candidateId" = c.id
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      ORDER BY jm."fitScore" DESC
      LIMIT 10;
    `);
    
    console.log('📋 Recent job matches:');
    jobMatches.rows.forEach(row => {
      console.log(`  - ${row.candidateName} (${row.candidateEmail})`);
      console.log(`    Position: ${row.positionTitle || row.jobTitle || 'Unknown'} (ID: ${row.jobId})`);
      console.log(`    Fit Score: ${row.fitScore}`);
      console.log('');
    });

    // Test the specific query logic from the API
    if (positions.rows.length > 0) {
      const testPositionId = positions.rows[0].id;
      console.log(`\n🔍 Testing API logic for position: ${testPositionId}`);
      
      // Test applied candidates query
      const appliedCandidates = await client.query(`
        SELECT COUNT(*) as count
        FROM "Candidate" c
        WHERE c."positionId" = $1
      `, [testPositionId]);
      
      console.log(`📊 Candidates who applied to this position: ${appliedCandidates.rows[0].count}`);

      // Test matched candidates query
      const matchedCandidates = await client.query(`
        SELECT COUNT(*) as count
        FROM "Candidate" c
        WHERE (c."positionId" IS NULL OR c."positionId" != $1)
          AND EXISTS (
            SELECT 1 FROM "JobMatch" jm 
            WHERE jm."candidateId" = c.id AND jm."jobId" = $1
          )
      `, [testPositionId]);
      
      console.log(`📊 Candidates with job matches but didn't apply: ${matchedCandidates.rows[0].count}`);

      // Show detailed applied candidates
      const detailedApplied = await client.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c."positionId",
          c.status,
          c."applicationDate"
        FROM "Candidate" c
        WHERE c."positionId" = $1
        ORDER BY c."applicationDate" DESC
      `, [testPositionId]);
      
      console.log('📋 Applied candidates for this position:');
      detailedApplied.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.email}) - Status: ${row.status}, Applied: ${row.applicationDate}`);
      });
    }

    client.release();
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

testCandidates();
