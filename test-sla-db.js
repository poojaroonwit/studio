const { getPool } = require('./src/lib/db');

async function testSLADatabase() {
  const client = await getPool().connect();
  
  try {
    console.log('Testing SLA database connection...');
    
    // Check Grade table
    const gradeResult = await client.query('SELECT COUNT(*) FROM "Grade"');
    console.log('Grade count:', gradeResult.rows[0].count);
    
    // Check Position table with grades
    const positionResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN "gradeId" IS NOT NULL THEN 1 END) as with_grade,
             COUNT(CASE WHEN "hiringDate" IS NOT NULL THEN 1 END) as with_hiring_date,
             COUNT(CASE WHEN "gradeId" IS NOT NULL AND "hiringDate" IS NOT NULL THEN 1 END) as sla_eligible
      FROM "Position"
      WHERE "isOpen" = true
    `);
    console.log('Position stats:', positionResult.rows[0]);
    
    // Check a few sample positions
    const sampleResult = await client.query(`
      SELECT 
        p.id,
        p.title,
        p."hiringDate",
        p."gradeId",
        g.name as "gradeName",
        g."sla_days"
      FROM "Position" p
      LEFT JOIN "Grade" g ON p."gradeId" = g.id
      WHERE p."isOpen" = true
      LIMIT 5
    `);
    console.log('Sample positions:', sampleResult.rows);
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    client.release();
  }
}

testSLADatabase().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
