const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkData() {
  try {
    console.log('🔍 Checking database data...');
    
    // Check positions
    const positionsResult = await pool.query('SELECT COUNT(*) as count FROM "Position"');
    console.log(`📊 Positions count: ${positionsResult.rows[0].count}`);
    
    // Check candidates
    const candidatesResult = await pool.query('SELECT COUNT(*) as count FROM "Candidate"');
    console.log(`👥 Candidates count: ${candidatesResult.rows[0].count}`);
    
    // Check users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM "User"');
    console.log(`👤 Users count: ${usersResult.rows[0].count}`);
    
    // Show some sample data
    if (positionsResult.rows[0].count > 0) {
      const samplePositions = await pool.query('SELECT title, department, "isOpen" FROM "Position" LIMIT 3');
      console.log('📋 Sample positions:', samplePositions.rows);
    }
    
    if (candidatesResult.rows[0].count > 0) {
      const sampleCandidates = await pool.query('SELECT name, email, status FROM "Candidate" LIMIT 3');
      console.log('👥 Sample candidates:', sampleCandidates.rows);
    }
    
    if (usersResult.rows[0].count > 0) {
      const sampleUsers = await pool.query('SELECT name, email, role FROM "User" LIMIT 3');
      console.log('👤 Sample users:', sampleUsers.rows);
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkData(); 