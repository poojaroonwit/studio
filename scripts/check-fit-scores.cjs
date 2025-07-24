// check-fit-scores.cjs
// Script to analyze fit score data and identify issues

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkFitScores() {
  console.log('🔍 Checking fit score data consistency...');
  console.log(`📊 Database URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`);

  try {
    const client = await pool.connect();
    
    // Check total candidates with fit scores
    const totalQuery = `
      SELECT COUNT(*) as total_candidates,
             COUNT(CASE WHEN "fitScore" IS NOT NULL THEN 1 END) as with_fit_score,
             COUNT(CASE WHEN "fitScore" IS NULL THEN 1 END) as without_fit_score
      FROM "Candidate";
    `;
    const totalResult = await client.query(totalQuery);
    const { total_candidates, with_fit_score, without_fit_score } = totalResult.rows[0];
    
    console.log(`\n📊 Fit Score Overview:`);
    console.log(`   Total candidates: ${total_candidates}`);
    console.log(`   With fit score: ${with_fit_score}`);
    console.log(`   Without fit score: ${without_fit_score}`);
    
    // Check fit score distribution
    const distributionQuery = `
      SELECT 
        CASE 
          WHEN "fitScore" IS NULL THEN 'NULL'
          WHEN "fitScore" = 0 THEN '0'
          WHEN "fitScore" > 0 AND "fitScore" < 1 THEN '0-1 (decimal)'
          WHEN "fitScore" >= 1 AND "fitScore" <= 20 THEN '1-20'
          WHEN "fitScore" > 20 AND "fitScore" <= 40 THEN '21-40'
          WHEN "fitScore" > 40 AND "fitScore" <= 60 THEN '41-60'
          WHEN "fitScore" > 60 AND "fitScore" <= 80 THEN '61-80'
          WHEN "fitScore" > 80 AND "fitScore" <= 100 THEN '81-100'
          ELSE 'Out of range'
        END as score_range,
        COUNT(*) as count,
        MIN("fitScore") as min_score,
        MAX("fitScore") as max_score,
        AVG("fitScore") as avg_score
      FROM "Candidate"
      GROUP BY 
        CASE 
          WHEN "fitScore" IS NULL THEN 'NULL'
          WHEN "fitScore" = 0 THEN '0'
          WHEN "fitScore" > 0 AND "fitScore" < 1 THEN '0-1 (decimal)'
          WHEN "fitScore" >= 1 AND "fitScore" <= 20 THEN '1-20'
          WHEN "fitScore" > 20 AND "fitScore" <= 40 THEN '21-40'
          WHEN "fitScore" > 40 AND "fitScore" <= 60 THEN '41-60'
          WHEN "fitScore" > 60 AND "fitScore" <= 80 THEN '61-80'
          WHEN "fitScore" > 80 AND "fitScore" <= 100 THEN '81-100'
          ELSE 'Out of range'
        END
      ORDER BY 
        CASE 
          WHEN "fitScore" IS NULL THEN 0
          WHEN "fitScore" = 0 THEN 1
          WHEN "fitScore" > 0 AND "fitScore" < 1 THEN 2
          WHEN "fitScore" >= 1 AND "fitScore" <= 20 THEN 3
          WHEN "fitScore" > 20 AND "fitScore" <= 40 THEN 4
          WHEN "fitScore" > 40 AND "fitScore" <= 60 THEN 5
          WHEN "fitScore" > 60 AND "fitScore" <= 80 THEN 6
          WHEN "fitScore" > 80 AND "fitScore" <= 100 THEN 7
          ELSE 8
        END;
    `;
    
    const distributionResult = await client.query(distributionQuery);
    
    console.log(`\n📊 Fit Score Distribution:`);
    distributionResult.rows.forEach(row => {
      console.log(`   ${row.score_range}: ${row.count} candidates`);
      if (row.min_score !== null) {
        console.log(`     Min: ${row.min_score}, Max: ${row.max_score}, Avg: ${parseFloat(row.avg_score).toFixed(2)}`);
      }
      console.log('');
    });
    
    // Check for candidates with decimal scores (potential issue)
    const decimalQuery = `
      SELECT id, name, email, "fitScore", 
             CASE 
               WHEN "parsedData"->>'job_applied' IS NOT NULL 
               THEN ("parsedData"->'job_applied'->>'fitScore')::float
               ELSE NULL 
             END as parsed_fit_score
      FROM "Candidate"
      WHERE "fitScore" > 0 AND "fitScore" < 1
      LIMIT 10;
    `;
    
    const decimalResult = await client.query(decimalQuery);
    
    if (decimalResult.rows.length > 0) {
      console.log(`\n⚠️  Found ${decimalResult.rows.length} candidates with decimal fit scores (0-1 range):`);
      decimalResult.rows.forEach(row => {
        console.log(`   - ${row.name} (${row.email})`);
        console.log(`     Database fitScore: ${row.fitScore}`);
        console.log(`     ParsedData fitScore: ${row.parsed_fit_score || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check for inconsistencies between database fitScore and parsedData
    const inconsistencyQuery = `
      SELECT id, name, email, "fitScore",
             CASE 
               WHEN "parsedData"->>'job_applied' IS NOT NULL 
               THEN ("parsedData"->'job_applied'->>'fitScore')::float
               ELSE NULL 
             END as parsed_fit_score
      FROM "Candidate"
      WHERE "parsedData"->>'job_applied' IS NOT NULL
        AND ("parsedData"->'job_applied'->>'fitScore')::float IS NOT NULL
        AND ABS("fitScore" - ("parsedData"->'job_applied'->>'fitScore')::float) > 0.01
      LIMIT 10;
    `;
    
    const inconsistencyResult = await client.query(inconsistencyQuery);
    
    if (inconsistencyResult.rows.length > 0) {
      console.log(`\n⚠️  Found ${inconsistencyResult.rows.length} candidates with inconsistent fit scores:`);
      inconsistencyResult.rows.forEach(row => {
        console.log(`   - ${row.name} (${row.email})`);
        console.log(`     Database fitScore: ${row.fitScore}`);
        console.log(`     ParsedData fitScore: ${row.parsed_fit_score}`);
        console.log(`     Difference: ${Math.abs(row.fitScore - row.parsed_fit_score).toFixed(2)}`);
        console.log('');
      });
    }
    
    // Test the score normalization logic
    console.log(`\n🧪 Testing Score Normalization Logic:`);
    
    const testScores = [0.5, 0.75, 0.9, 50, 75, 90, 100, null, undefined];
    
    testScores.forEach(score => {
      // Apply the same normalization logic as in the code
      let normalized;
      if (score === null || score === undefined) {
        normalized = 0;
      } else if (score > 0 && score < 1) {
        normalized = Math.round(score * 100);
      } else if (score >= 0 && score <= 100) {
        normalized = Math.round(score);
      } else {
        normalized = Math.max(0, Math.min(100, Math.round(score)));
      }
      
      console.log(`   ${score} → ${normalized}`);
    });
    
    // Check score range assignments based on SCORE_GRADES
    const scoreGrades = [
      { letter: 'A', range: '81-100', min: 81, max: 100 },
      { letter: 'B', range: '61-80', min: 61, max: 80 },
      { letter: 'C', range: '41-60', min: 41, max: 60 },
      { letter: 'D', range: '21-40', min: 21, max: 40 },
      { letter: 'E', range: '0-20', min: 0, max: 20 },
    ];
    
    console.log(`\n📊 Score Grade Distribution (Expected in Dashboard):`);
    
    for (const grade of scoreGrades) {
      const gradeQuery = `
        SELECT COUNT(*) as count
        FROM "Candidate"
        WHERE "fitScore" >= ${grade.min} AND "fitScore" <= ${grade.max}
          AND status NOT IN ('Hired', 'Rejected', 'Offer Accepted');
      `;
      
      const gradeResult = await client.query(gradeQuery);
      const count = gradeResult.rows[0].count;
      
      console.log(`   Grade ${grade.letter} (${grade.range}): ${count} candidates`);
    }
    
    client.release();
    
    console.log(`\n✅ Fit score analysis completed!`);
    
  } catch (error) {
    console.error('❌ Error analyzing fit scores:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the analysis
checkFitScores().catch(console.error); 