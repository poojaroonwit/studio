const { Pool } = require('pg');
require('dotenv').config();

async function checkPositionCount() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query('SELECT COUNT(*) FROM "Position"');
    console.log('Total positions:', result.rows[0].count);
    
    // Also check if there are any positions with grades
    const gradeResult = await pool.query('SELECT COUNT(*) FROM "Position" WHERE "gradeId" IS NOT NULL');
    console.log('Positions with grades:', gradeResult.rows[0].count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPositionCount();
