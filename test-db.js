const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test Position table query
    const result = await client.query('SELECT COUNT(*) as count FROM "Position"');
    console.log('✅ Position table query successful');
    console.log('Position count:', result.rows[0].count);
    
    // Test a more complex query similar to the API
    const complexQuery = `
      SELECT 
        p.id, 
        p.title, 
        p.department,
        u.name as "recruiterName"
      FROM "Position" p 
      LEFT JOIN "User" u ON p."recruiterId" = u.id
      LIMIT 5
    `;
    
    const complexResult = await client.query(complexQuery);
    console.log('✅ Complex query successful');
    console.log('Sample positions:', complexResult.rows.length);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testDatabase();
