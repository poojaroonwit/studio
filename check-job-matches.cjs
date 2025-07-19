const { Pool } = require('pg');

async function checkJobMatches() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('FATAL: DATABASE_URL environment variable is not set.');
    return;
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
    idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '2000')
  });
  
  try {
    // Check total job matches
    const countResult = await pool.query('SELECT COUNT(*) as count FROM "JobMatch"');
    console.log('Total job matches in database:', countResult.rows[0].count);
    
    // Check job matches by candidate
    const candidateMatchesResult = await pool.query(`
      SELECT 
        c.name as candidate_name,
        c.id as candidate_id,
        COUNT(jm.id) as match_count
      FROM "Candidate" c
      LEFT JOIN "JobMatch" jm ON c.id = jm."candidateId"
      GROUP BY c.id, c.name
      HAVING COUNT(jm.id) > 0
      ORDER BY match_count DESC
      LIMIT 10
    `);
    
    console.log('\nTop candidates with job matches:');
    candidateMatchesResult.rows.forEach(row => {
      console.log(`${row.candidate_name} (${row.candidate_id}): ${row.match_count} matches`);
    });
    
    // Check a specific candidate's job matches
    if (candidateMatchesResult.rows.length > 0) {
      const firstCandidate = candidateMatchesResult.rows[0];
      const detailedMatches = await pool.query(`
        SELECT 
          jm.*,
          p.title as position_title
        FROM "JobMatch" jm
        LEFT JOIN "Position" p ON jm."jobId" = p.id
        WHERE jm."candidateId" = $1
        ORDER BY jm."fitScore" DESC
      `, [firstCandidate.candidate_id]);
      
      console.log(`\nDetailed job matches for ${firstCandidate.candidate_name}:`);
      detailedMatches.rows.forEach(match => {
        console.log(`- ${match.position_title || 'Unknown Position'} (Score: ${match.fitScore})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkJobMatches(); 