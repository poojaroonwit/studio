const { Pool } = require('pg');
require('dotenv').config();

async function debugStatusFilter() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Debugging Status Filter Issues...\n');

    // 1. Check what statuses exist in the database
    console.log('1. Checking existing statuses in Candidate table:');
    const statusQuery = `
      SELECT DISTINCT status, COUNT(*) as count 
      FROM "Candidate" 
      GROUP BY status 
      ORDER BY count DESC;
    `;
    const statusResult = await pool.query(statusQuery);
    console.log('Statuses in database:');
    statusResult.rows.forEach(row => {
      console.log(`  - "${row.status}" (${row.count} candidates)`);
    });

    // 2. Check what recruitment stages exist
    console.log('\n2. Checking RecruitmentStage table:');
    const stagesQuery = `
      SELECT name, description, "sortOrder" 
      FROM "RecruitmentStage" 
      ORDER BY "sortOrder";
    `;
    const stagesResult = await pool.query(stagesQuery);
    console.log('Recruitment stages:');
    stagesResult.rows.forEach(row => {
      console.log(`  - "${row.name}" (${row.description || 'No description'})`);
    });

    // 3. Test status filtering with different values
    console.log('\n3. Testing status filtering:');
    
    // Test with "Applied" status
    const appliedQuery = `
      SELECT COUNT(*) as count 
      FROM "Candidate" 
      WHERE status = 'Applied';
    `;
    const appliedResult = await pool.query(appliedQuery);
    console.log(`  - Candidates with status "Applied": ${appliedResult.rows[0].count}`);

    // Test with NULL status
    const nullQuery = `
      SELECT COUNT(*) as count 
      FROM "Candidate" 
      WHERE status IS NULL OR status = '' OR status = 'null';
    `;
    const nullResult = await pool.query(nullQuery);
    console.log(`  - Candidates with NULL/empty status: ${nullResult.rows[0].count}`);

    // Test with a few sample candidates
    console.log('\n4. Sample candidates with their statuses:');
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
    console.log('\n5. Testing API query logic:');
    
    // Test with "Applied" status (single status)
    const apiQuery1 = `
      SELECT COUNT(*) as count 
      FROM "Candidate" c
      WHERE c.status = $1;
    `;
    const apiResult1 = await pool.query(apiQuery1, ['Applied']);
    console.log(`  - API query with status='Applied': ${apiResult1.rows[0].count} candidates`);

    // Test with multiple statuses
    const apiQuery2 = `
      SELECT COUNT(*) as count 
      FROM "Candidate" c
      WHERE c.status = ANY($1);
    `;
    const apiResult2 = await pool.query(apiQuery2, [['Applied', 'Screening']]);
    console.log(`  - API query with status=['Applied', 'Screening']: ${apiResult2.rows[0].count} candidates`);

    // Test with "Off" status (should match NULL/empty)
    const apiQuery3 = `
      SELECT COUNT(*) as count 
      FROM "Candidate" c
      WHERE (c.status IS NULL OR c.status = '' OR c.status = 'null');
    `;
    const apiResult3 = await pool.query(apiQuery3);
    console.log(`  - API query with "Off" status (NULL/empty): ${apiResult3.rows[0].count} candidates`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugStatusFilter(); 