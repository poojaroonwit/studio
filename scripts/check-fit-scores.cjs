const { Pool } = require('pg');
require('dotenv').config();

async function checkFitScores() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking fit scores in the database...\n');

    // Check total candidates
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM "Candidate"');
    console.log(`Total candidates: ${totalResult.rows[0].total}`);

    // Check fit score distribution
    const fitScoreResult = await pool.query(`
      SELECT 
        "fitScore",
        COUNT(*) as count,
        CASE 
          WHEN "fitScore" IS NULL THEN 'NULL'
          WHEN "fitScore" = 0 THEN 'Zero'
          WHEN "fitScore" BETWEEN 1 AND 25 THEN '1-25'
          WHEN "fitScore" BETWEEN 26 AND 50 THEN '26-50'
          WHEN "fitScore" BETWEEN 51 AND 75 THEN '51-75'
          WHEN "fitScore" BETWEEN 76 AND 100 THEN '76-100'
          ELSE 'Other'
        END as range
      FROM "Candidate" 
      GROUP BY "fitScore"
      ORDER BY "fitScore" ASC NULLS FIRST
    `);

    console.log('\nFit Score Distribution:');
    console.log('Score | Count | Range');
    console.log('------|-------|-------');
    fitScoreResult.rows.forEach(row => {
      console.log(`${row.fitScore || 'NULL'} | ${row.count} | ${row.range}`);
    });

    // Check a few sample candidates with their fit scores
    const sampleResult = await pool.query(`
      SELECT id, name, email, "fitScore", status, "positionId"
      FROM "Candidate" 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `);

    console.log('\nSample Candidates:');
    console.log('ID | Name | Email | Fit Score | Status | Position ID');
    console.log('---|------|-------|-----------|--------|-------------');
    sampleResult.rows.forEach(row => {
      console.log(`${row.id.substring(0, 8)}... | ${row.name} | ${row.email} | ${row.fitScore || 'NULL'} | ${row.status} | ${row.positionId || 'NULL'}`);
    });

    // Check if there are any job matches that might have fit scores
    const jobMatchesResult = await pool.query(`
      SELECT COUNT(*) as total_matches, 
             COUNT(CASE WHEN "fitScore" > 0 THEN 1 END) as matches_with_score,
             AVG("fitScore") as avg_fit_score
      FROM "JobMatch"
    `);

    console.log('\nJob Matches:');
    console.log(`Total job matches: ${jobMatchesResult.rows[0].total_matches}`);
    console.log(`Matches with fit score > 0: ${jobMatchesResult.rows[0].matches_with_score}`);
    console.log(`Average fit score: ${jobMatchesResult.rows[0].avg_fit_score || 'N/A'}`);

    // Check if candidates have job matches
    const candidatesWithMatchesResult = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c."fitScore" as candidate_fit_score,
        COUNT(jm.id) as job_matches_count,
        AVG(jm."fitScore") as avg_job_match_score
      FROM "Candidate" c
      LEFT JOIN "JobMatch" jm ON c.id = jm."candidateId"
      GROUP BY c.id, c.name, c."fitScore"
      HAVING COUNT(jm.id) > 0
      ORDER BY c."createdAt" DESC
      LIMIT 5
    `);

    if (candidatesWithMatchesResult.rows.length > 0) {
      console.log('\nCandidates with Job Matches:');
      console.log('Candidate | Candidate Fit Score | Job Matches | Avg Job Match Score');
      console.log('-----------|-------------------|-------------|-------------------');
      candidatesWithMatchesResult.rows.forEach(row => {
        console.log(`${row.name} | ${row.candidate_fit_score || 'NULL'} | ${row.job_matches_count} | ${row.avg_job_match_score || 'N/A'}`);
      });
    } else {
      console.log('\nNo candidates have job matches.');
    }

  } catch (error) {
    console.error('Error checking fit scores:', error);
  } finally {
    await pool.end();
  }
}

checkFitScores(); 