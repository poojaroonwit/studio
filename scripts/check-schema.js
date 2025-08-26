require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking Database Schema...\n');
    
    // Check User table columns
    console.log('User table columns:');
    const userColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      ORDER BY ordinal_position
    `);
    
    userColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // Check RecruitmentStage table columns
    console.log('RecruitmentStage table columns:');
    const stageColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'RecruitmentStage' 
      ORDER BY ordinal_position
    `);
    
    stageColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // Check UserGroup table columns
    console.log('UserGroup table columns:');
    const groupColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'UserGroup' 
      ORDER BY ordinal_position
    `);
    
    groupColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);
