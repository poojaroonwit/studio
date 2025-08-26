const { Pool } = require('pg');
require('dotenv').config();

async function testHorizontalFitScoreFiltering() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🧪 Testing horizontal fit score filtering...');

    // Test 1: Check if candidates exist
    const candidatesResult = await pool.query('SELECT COUNT(*) as count FROM "Candidate"');
    console.log(`📊 Total candidates in database: ${candidatesResult.rows[0].count}`);

    // Test 2: Check if JobMatch records exist
    const jobMatchesResult = await pool.query('SELECT COUNT(*) as count FROM "JobMatch"');
    console.log(`📊 Total JobMatch records: ${jobMatchesResult.rows[0].count}`);

    // Test 3: Check candidate fit scores distribution
    const fitScoreDistribution = await pool.query(`
      SELECT 
        CASE 
          WHEN "fitScore" >= 0.81 THEN 'A'
          WHEN "fitScore" >= 0.61 THEN 'B'
          WHEN "fitScore" >= 0.41 THEN 'C'
          WHEN "fitScore" >= 0.21 THEN 'D'
          WHEN "fitScore" >= 0.01 THEN 'E'
          ELSE 'no-score'
        END as grade,
        COUNT(*) as count
      FROM "Candidate"
      GROUP BY grade
      ORDER BY grade
    `);
    console.log('📊 Applied fit score distribution:');
    fitScoreDistribution.rows.forEach(row => {
      console.log(`   ${row.grade}: ${row.count} candidates`);
    });

    // Test 4: Check matching fit score distribution
    const matchingFitScoreDistribution = await pool.query(`
      SELECT 
        CASE 
          WHEN jm."fitScore" >= 0.81 THEN 'A'
          WHEN jm."fitScore" >= 0.61 THEN 'B'
          WHEN jm."fitScore" >= 0.41 THEN 'C'
          WHEN jm."fitScore" >= 0.21 THEN 'D'
          WHEN jm."fitScore" >= 0.01 THEN 'E'
          ELSE 'no-score'
        END as grade,
        COUNT(*) as count
      FROM "JobMatch" jm
      GROUP BY grade
      ORDER BY grade
    `);
    console.log('📊 Matching fit score distribution:');
    matchingFitScoreDistribution.rows.forEach(row => {
      console.log(`   ${row.grade}: ${row.count} matches`);
    });

    // Test 5: Test specific filter scenarios
    console.log('\n🔍 Testing specific filter scenarios:');

    // Test A grade filtering (0.81-1.0)
    const aGradeCandidates = await pool.query(`
      SELECT COUNT(*) as count
      FROM "Candidate" c
      WHERE c."fitScore" >= 0.81 AND c."fitScore" <= 1.0
    `);
    console.log(`   A grade candidates (0.81-1.0): ${aGradeCandidates.rows[0].count}`);

    // Test matching A grade filtering
    const matchingAGradeCandidates = await pool.query(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM "Candidate" c
      WHERE EXISTS (
        SELECT 1 FROM "JobMatch" jm 
        WHERE jm."candidateId" = c.id AND jm."fitScore" >= 0.81
      )
    `);
    console.log(`   Candidates with matching A grade (≥0.81): ${matchingAGradeCandidates.rows[0].count}`);

    // Test C grade filtering (0.41-0.60)
    const cGradeCandidates = await pool.query(`
      SELECT COUNT(*) as count
      FROM "Candidate" c
      WHERE c."fitScore" >= 0.41 AND c."fitScore" <= 0.60
    `);
    console.log(`   C grade candidates (0.41-0.60): ${cGradeCandidates.rows[0].count}`);

    // Test matching C grade filtering
    const matchingCGradeCandidates = await pool.query(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM "Candidate" c
      WHERE EXISTS (
        SELECT 1 FROM "JobMatch" jm 
        WHERE jm."candidateId" = c.id AND jm."fitScore" >= 0.41 AND jm."fitScore" <= 0.60
      )
    `);
    console.log(`   Candidates with matching C grade (0.41-0.60): ${matchingCGradeCandidates.rows[0].count}`);

    console.log('\n✅ Horizontal fit score filtering test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Navigate to the Candidates page in your browser');
    console.log('   2. Look for the horizontal fit score filter tabs above the candidate table');
    console.log('   3. Click on different grade tabs (A, B, C, D, E) to test filtering');
    console.log('   4. Check the browser console for debug logs');
    console.log('   5. Verify that the candidate list updates correctly');

  } catch (error) {
    console.error('❌ Error testing horizontal fit score filtering:', error);
  } finally {
    await pool.end();
  }
}

testHorizontalFitScoreFiltering();
