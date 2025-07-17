const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:8521/studio'
});

async function testJobMatches() {
  const client = await pool.connect();
  
  try {
    const candidateId = '8ce5efc6-1728-41d2-a058-9b1026d7fabe';
    
    console.log('Testing job matches for candidate:', candidateId);
    
    // Check if candidate exists
    const candidateQuery = 'SELECT id, name, email FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [candidateId]);
    
    if (candidateResult.rows.length === 0) {
      console.log('❌ Candidate not found');
      return;
    }
    
    const candidate = candidateResult.rows[0];
    console.log('✅ Candidate found:', candidate.name, candidate.email);
    
    // Check existing job matches
    const jobMatchesQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1
      ORDER BY jm."fitScore" DESC;
    `;
    const jobMatchesResult = await client.query(jobMatchesQuery, [candidateId]);
    
    console.log('📊 Current job matches:', jobMatchesResult.rows.length);
    
    if (jobMatchesResult.rows.length === 0) {
      console.log('❌ No job matches found');
      
      // Check if there are any positions available
      const positionsQuery = 'SELECT id, title FROM "Position" LIMIT 5';
      const positionsResult = await client.query(positionsQuery);
      
      if (positionsResult.rows.length > 0) {
        console.log('📋 Available positions:');
        positionsResult.rows.forEach((pos, index) => {
          console.log(`  ${index + 1}. ${pos.title} (${pos.id})`);
        });
        
        // Add a test job match
        const testPosition = positionsResult.rows[0];
        const testMatchId = require('crypto').randomUUID();
        
        const insertQuery = `
          INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `;
        
        await client.query(insertQuery, [
          testMatchId,
          candidateId,
          testPosition.id,
          85,
          ['Strong technical skills', 'Relevant experience', 'Good cultural fit']
        ]);
        
        console.log('✅ Added test job match:', {
          position: testPosition.title,
          fitScore: 85,
          matchReasons: ['Strong technical skills', 'Relevant experience', 'Good cultural fit']
        });
      } else {
        console.log('❌ No positions available in database');
      }
    } else {
      console.log('✅ Job matches found:');
      jobMatchesResult.rows.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.positionTitle || 'Unknown Position'} (${match.fitScore}% match)`);
        if (match.matchReasons && match.matchReasons.length > 0) {
          console.log(`     Reasons: ${match.matchReasons.join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testJobMatches(); 