const { Pool } = require('pg');
require('dotenv').config();

async function debugStatusFilter() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. Check what statuses exist in the database
    const statusQuery = `
      SELECT DISTINCT status, COUNT(*) as count 
      FROM "Candidate" 
      GROUP BY status 
      ORDER BY count DESC;
    `;
    const statusResult = await pool.query(statusQuery);
    statusResult.rows.forEach(row => {
      console.log(`  - "${row.status}" (${row.count} candidates)`);
    });

    // 2. Check what recruitment stages exist
    const stagesQuery = `
      SELECT name, description, "sortOrder" 
      FROM "RecruitmentStage" 
      ORDER BY "sortOrder";
    `;
    const stagesResult = await pool.query(stagesQuery);
    stagesResult.rows.forEach(row => {
      console.log(`  - "${row.name}" (${row.description || 'No description'})`);
    });

    // 3. Test status filtering with different values
    
    // Test with "Applied" status
    const appliedQuery = `
      SELECT COUNT(*) as count 
      FROM "Candidate" 
      WHERE status = 'Applied';
    `;
    const appliedResult = await pool.query(appliedQuery);

    // Test with NULL status
    const nullQuery = `
      SELECT COUNT(*) as count 
      FROM "Candidate" 
      WHERE status IS NULL OR status = '' OR status = 'null';
    `;
    const nullResult = await pool.query(nullQuery);

    // Test with a few sample candidates
    const sampleQuery = `
      SELECT name, email, status, "applicationDate"
      FROM "Candidate" 
      ORDER BY "applicationDate" DESC 
      LIMIT 10;
    `;
    const sampleResult = await pool.query(sampleQuery);
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (${row.email}) - Status: "${row.status}"`);
    });

    // 5. Test the exact query that the API uses
    
    // Test with "Applied" status (single status)
    const apiQuery1 = `
      SELECT COUNT(*) as count 
      FROM "Candidate" c
      WHERE c.status = $1;
    `;
    const apiResult1 = await pool.query(apiQuery1, ['Applied']);

    // Test with multiple statuses
    const apiQuery2 = `
      SELECT COUNT(*) as count 
      FROM "Candidate" c
      WHERE c.status = ANY($1);
    `;
    const apiResult2 = await pool.query(apiQuery2, [['Applied', 'Screening']]);

    // Test with "Off" status (should match NULL/empty)
    const apiQuery3 = `
      SELECT COUNT(*) as count 
      FROM "Candidate" c
      WHERE (c.status IS NULL OR c.status = '' OR c.status = 'null');
    `;
    const apiResult3 = await pool.query(apiQuery3);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugStatusFilter(); 