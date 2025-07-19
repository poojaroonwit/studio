const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:8521/studio5_production',
});

async function debugJobMatches() {
  const client = await pool.connect();
  
  try {
    console.log('=== DEBUGGING JOB MATCHES ===');
    
    // Test candidate ID from the error
    const candidateId = '6d80e3b4-5251-46a5-af47-e115704e85f5';
    const jobId = '11111111-1111-1111-1111-111111111111';
    
    // 1. Check if candidate exists
    console.log('\n1. Checking if candidate exists...');
    const candidateResult = await client.query('SELECT id, name, email FROM "Candidate" WHERE id = $1', [candidateId]);
    console.log('Candidate result:', candidateResult.rows);
    
    // 2. Check if position exists
    console.log('\n2. Checking if position exists...');
    const positionResult = await client.query('SELECT id, title FROM "Position" WHERE id = $1', [jobId]);
    console.log('Position result:', positionResult.rows);
    
    // 3. Check existing job matches for this candidate
    console.log('\n3. Checking existing job matches...');
    const existingMatchesResult = await client.query('SELECT * FROM "JobMatch" WHERE "candidateId" = $1', [candidateId]);
    console.log('Existing matches:', existingMatchesResult.rows);
    
    // 4. Check JobMatch table structure
    console.log('\n4. Checking JobMatch table structure...');
    const tableStructureResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'JobMatch' 
      ORDER BY ordinal_position
    `);
    console.log('JobMatch table structure:', tableStructureResult.rows);
    
    // 5. Test the insert query
    console.log('\n5. Testing insert query...');
    try {
      const testInsertResult = await client.query(`
        INSERT INTO "JobMatch" (id, "candidateId", "jobId", "fitScore", "matchReasons", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [
        'test-id-' + Date.now(),
        candidateId,
        jobId,
        20, // fitScore as integer
        ['test reason'], // matchReasons as array
      ]);
      console.log('Test insert successful:', testInsertResult.rows[0]);
      
      // Clean up test data
      await client.query('DELETE FROM "JobMatch" WHERE id = $1', [testInsertResult.rows[0].id]);
      console.log('Test data cleaned up');
      
    } catch (insertError) {
      console.error('Test insert failed:', insertError);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugJobMatches().catch(console.error); 