require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyPositionLevelsMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Applying PositionLevel migration...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_position_levels.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sqlContent);
    
    console.log('✅ PositionLevel table created successfully!');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'PositionLevel'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ PositionLevel table verified in database');
      
      // Check if data was seeded
      const countResult = await pool.query('SELECT COUNT(*) as count FROM "PositionLevel"');
      console.log(`📊 PositionLevel records: ${countResult.rows[0].count}`);
    } else {
      console.log('❌ PositionLevel table not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error applying PositionLevel migration:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists, skipping creation');
    }
  } finally {
    await pool.end();
  }
}

applyPositionLevelsMigration();
