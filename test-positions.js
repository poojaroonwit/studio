const { Pool } = require('pg');
require('dotenv').config();

async function testPositions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('Database connection successful');
    
    // Check if Position table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Position'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Position table does not exist');
      return;
    }
    
    console.log('✅ Position table exists');
    
    // Count total positions
    const countResult = await client.query('SELECT COUNT(*) as count FROM "Position"');
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Total positions in database: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('❌ No positions found in database');
      console.log('This is why the upload CV modal shows "No positions available"');
      return;
    }
    
    // Get sample positions
    const samplePositions = await client.query(`
      SELECT id, title, department, "isOpen", "createdAt" 
      FROM "Position" 
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `);
    
    console.log('📋 Sample positions:');
    samplePositions.rows.forEach((pos, index) => {
      console.log(`  ${index + 1}. ${pos.title} (${pos.department}) - ${pos.isOpen ? 'Open' : 'Closed'}`);
    });
    
    // Check for open positions
    const openCount = await client.query('SELECT COUNT(*) as count FROM "Position" WHERE "isOpen" = true');
    console.log(`🔓 Open positions: ${openCount.rows[0].count}`);
    
    // Check for closed positions
    const closedCount = await client.query('SELECT COUNT(*) as count FROM "Position" WHERE "isOpen" = false');
    console.log(`🔒 Closed positions: ${closedCount.rows[0].count}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testPositions();
