const { Pool } = require('pg');
require('dotenv').config();

async function testExport() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Testing export query...');
    
    const query = `
      SELECT 
        c.*,
        p.title as position_title,
        u.name as recruiter_name,
        COALESCE(
          json_agg(
            json_build_object(
              'jobTitle', jm."jobTitle",
              'fitScore', jm."fitScore",
              'matchReasons', jm."matchReasons",
              'jobDescriptionSummary', jm."job_description_summary"
            ) ORDER BY jm."fitScore" DESC NULLS LAST
          ) FILTER (WHERE jm.id IS NOT NULL),
          '[]'::json
        ) as job_matches
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      LEFT JOIN "JobMatch" jm ON c.id = jm."candidateId"
      GROUP BY c.id, p.title, u.name
      ORDER BY c."applicationDate" DESC
      LIMIT 5
    `;
    
    const result = await pool.query(query);
    console.log('✅ Export query successful');
    console.log(`Rows returned: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('Sample row keys:', Object.keys(result.rows[0]));
      console.log('Sample data:', JSON.stringify(result.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Export query failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testExport();
