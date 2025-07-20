const { Pool } = require('pg');
require('dotenv').config();

async function fixFitScores() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Fixing NULL fit scores in the database...\n');

    // Update all candidates with NULL fit scores to 0
    const updateResult = await pool.query(`
      UPDATE "Candidate" 
      SET "fitScore" = 0 
      WHERE "fitScore" IS NULL
    `);

    console.log(`Updated ${updateResult.rowCount} candidates with NULL fit scores to 0`);

    // Verify the fix
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as null_count 
      FROM "Candidate" 
      WHERE "fitScore" IS NULL
    `);

    console.log(`Candidates with NULL fit scores after fix: ${verifyResult.rows[0].null_count}`);

    // Show the current fit score distribution
    const distributionResult = await pool.query(`
      SELECT 
        "fitScore",
        COUNT(*) as count
      FROM "Candidate" 
      GROUP BY "fitScore"
      ORDER BY "fitScore" ASC
    `);

    console.log('\nCurrent Fit Score Distribution:');
    console.log('Score | Count');
    console.log('------|------');
    distributionResult.rows.forEach(row => {
      console.log(`${row.fitScore} | ${row.count}`);
    });

  } catch (error) {
    console.error('Error fixing fit scores:', error);
  } finally {
    await pool.end();
  }
}

fixFitScores(); 