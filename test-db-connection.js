const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set.');
    return;
  }
  
  console.log('📊 Database URL:', databaseUrl.replace(/:[^:@]*@/, ':****@')); // Hide password
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    console.log('🔌 Attempting to connect to database...');
    const client = await pool.connect();
    
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    console.log('🔍 Testing simple query...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful:', result.rows[0]);
    
    // Test candidate table access
    console.log('🔍 Testing candidate table access...');
    const candidateCount = await client.query('SELECT COUNT(*) as count FROM "Candidate" LIMIT 1');
    console.log('✅ Candidate table accessible. Total candidates:', candidateCount.rows[0].count);
    
    // Test specific candidate ID
    const testCandidateId = '419c85b4-642e-4ce7-b790-4b4090660409';
    console.log(`🔍 Testing specific candidate ID: ${testCandidateId}`);
    
    try {
      const candidateResult = await client.query('SELECT id, name FROM "Candidate" WHERE id = $1::uuid', [testCandidateId]);
      if (candidateResult.rows.length > 0) {
        console.log('✅ Candidate found:', candidateResult.rows[0]);
      } else {
        console.log('⚠️  Candidate not found in database');
      }
    } catch (candidateError) {
      console.error('❌ Error querying specific candidate:', candidateError.message);
    }
    
    client.release();
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
