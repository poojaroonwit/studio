// Script to check if candidate exists in database
import { Pool } from 'pg';

async function checkCandidate() {
  const candidateId = '9ac70c0c-5475-46d1-b39d-dfcf80a1c5e9';
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log('Checking candidate:', candidateId);
    
    // Check if candidate exists
    const candidateResult = await pool.query('SELECT * FROM "Candidate" WHERE id = $1::uuid', [candidateId]);
    
    if (candidateResult.rows.length === 0) {
      console.log('❌ Candidate not found in database');
      return;
    }
    
    const candidate = candidateResult.rows[0];
    console.log('✅ Candidate found:');
    console.log('  Name:', candidate.name);
    console.log('  Email:', candidate.email);
    console.log('  Status:', candidate.status);
    console.log('  Position ID:', candidate.positionId);
    console.log('  Recruiter ID:', candidate.recruiterId);
    
    // Check if position exists (if candidate has one)
    if (candidate.positionId) {
      const positionResult = await pool.query('SELECT * FROM "Position" WHERE id = $1::uuid', [candidate.positionId]);
      if (positionResult.rows.length === 0) {
        console.log('❌ Position not found:', candidate.positionId);
      } else {
        console.log('✅ Position found:', positionResult.rows[0].title);
      }
    }
    
    // Check if recruiter exists (if candidate has one)
    if (candidate.recruiterId) {
      const recruiterResult = await pool.query('SELECT * FROM "User" WHERE id = $1::uuid', [candidate.recruiterId]);
      if (recruiterResult.rows.length === 0) {
        console.log('❌ Recruiter not found:', candidate.recruiterId);
      } else {
        console.log('✅ Recruiter found:', recruiterResult.rows[0].name);
      }
    }
    
    // Check recruitment stages
    const stagesResult = await pool.query('SELECT name FROM "RecruitmentStage" ORDER BY "sortOrder"');
    console.log('Available stages:', stagesResult.rows.map(r => r.name));
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

checkCandidate(); 