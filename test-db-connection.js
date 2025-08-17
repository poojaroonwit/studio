const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test basic connection
    console.log('🔍 Testing basic connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');

    // Check if SystemSetting table exists
    console.log('🔍 Checking SystemSetting table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SystemSetting'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ SystemSetting table exists');
      
      // Count system settings
      const countResult = await client.query('SELECT COUNT(*) as count FROM "SystemSetting"');
      console.log(`📊 Found ${countResult.rows[0].count} system settings`);
      
      // List all system settings
      const settingsResult = await client.query('SELECT key, value FROM "SystemSetting" ORDER BY key');
      console.log('📋 System settings:');
      settingsResult.rows.forEach(row => {
        console.log(`  - ${row.key}: ${row.value}`);
      });
    } else {
      console.log('❌ SystemSetting table does not exist');
    }

    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
