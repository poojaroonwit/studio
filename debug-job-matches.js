const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/studio6'
});

async function debugJobMatches() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging JobMatches API...');
    
    const candidateId = 'd6b21bea-779c-4115-bacc-04293c2588ee';
    
    // Check if candidate exists
    console.log(`\n1. Checking if candidate exists: ${candidateId}`);
    const candidateQuery = 'SELECT id, name, email FROM "Candidate" WHERE id = $1';
    const candidateResult = await client.query(candidateQuery, [candidateId]);
    console.log(`   Candidate found: ${candidateResult.rows.length > 0}`);
    if (candidateResult.rows.length > 0) {
      console.log(`   Candidate details:`, candidateResult.rows[0]);
    }
    
    // Check JobMatch table structure
    console.log('\n2. Checking JobMatch table structure...');
    const tableQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'JobMatch' 
      ORDER BY ordinal_position;
    `;
    const tableResult = await client.query(tableQuery);
    console.log('   JobMatch table columns:');
    tableResult.rows.forEach(row => {
      console.log(`     ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if there are any job matches for this candidate
    console.log('\n3. Checking existing job matches...');
    const matchesQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1
      ORDER BY jm."fitScore" DESC;
    `;
    const matchesResult = await client.query(matchesQuery, [candidateId]);
    console.log(`   Job matches found: ${matchesResult.rows.length}`);
    if (matchesResult.rows.length > 0) {
      console.log('   Sample match:', matchesResult.rows[0]);
    }
    
    // Test the exact query from the API
    console.log('\n4. Testing API query...');
    const apiQuery = `
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1
      ORDER BY jm."fitScore" DESC;
    `;
    const apiResult = await client.query(apiQuery, [candidateId]);
    console.log(`   API query result: ${apiResult.rows.length} rows`);
    
    // Check for any database errors
    console.log('\n5. Checking for any database issues...');
    const errorQuery = 'SELECT 1 as test';
    const errorResult = await client.query(errorQuery);
    console.log('   Database connection test:', errorResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugJobMatches().catch(console.error); 