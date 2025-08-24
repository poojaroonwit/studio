const { Pool } = require('pg');
require('dotenv').config();

async function checkFitScores() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    // Check all fit scores
    const allScoresResult = await client.query(`
      SELECT "fitScore", COUNT(*) as count 
      FROM "Candidate" 
      WHERE "fitScore" IS NOT NULL 
      GROUP BY "fitScore" 
      ORDER BY "fitScore"
    `);
    
    console.log('All fit scores in database:');
    allScoresResult.rows.forEach(row => {
      console.log(`  ${row.fitScore}: ${row.count} candidates`);
    });
    
    // Check C range (0.41 to 0.60)
    const cRangeResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM "Candidate" 
      WHERE "fitScore" >= 0.41 AND "fitScore" <= 0.60
    `);
    
    console.log(`\nCandidates in C range (0.41-0.60): ${cRangeResult.rows[0].total}`);
    
    // Check total candidates
    const totalResult = await client.query(`SELECT COUNT(*) as total FROM "Candidate"`);
    console.log(`Total candidates: ${totalResult.rows[0].total}`);
    
    client.release();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkFitScores();
