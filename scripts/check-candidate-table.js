import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkCandidateTable() {
  console.log('🔍 Checking candidate table...');
  console.log(`📊 Database URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`);

  try {
    const client = await pool.connect();
    
    // Check table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Candidate'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('\n📋 Candidate table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check total candidates
    const countQuery = 'SELECT COUNT(*) as total FROM "Candidate";';
    const countResult = await client.query(countQuery);
    const totalCandidates = parseInt(countResult.rows[0].total);
    console.log(`\n📊 Total candidates in database: ${totalCandidates}`);

    if (totalCandidates > 0) {
      // Get sample candidates with their status
      const sampleQuery = `
        SELECT id, name, email, status, "applicationDate", "fitScore", "recruiterId", "positionId"
        FROM "Candidate"
        ORDER BY "applicationDate" DESC
        LIMIT 10;
      `;
      const sampleResult = await client.query(sampleQuery);
      
      console.log('\n📋 Sample candidates:');
      sampleResult.rows.forEach((candidate, index) => {
        console.log(`   ${index + 1}. ${candidate.name} (${candidate.email})`);
        console.log(`      Status: ${candidate.status}`);
        console.log(`      Application Date: ${candidate.applicationDate}`);
        console.log(`      Fit Score: ${candidate.fitScore || 'N/A'}`);
        console.log(`      Recruiter ID: ${candidate.recruiterId || 'Unassigned'}`);
        console.log(`      Position ID: ${candidate.positionId || 'Unassigned'}`);
        console.log('');
      });

      // Check status distribution
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM "Candidate"
        GROUP BY status
        ORDER BY count DESC;
      `;
      const statusResult = await client.query(statusQuery);
      
      console.log('📊 Status distribution:');
      statusResult.rows.forEach(row => {
        console.log(`   - ${row.status}: ${row.count}`);
      });
    }

    client.release();
  } catch (error) {
    console.error('❌ Error checking candidate table:', error.message);
  } finally {
    await pool.end();
  }
}

checkCandidateTable(); 