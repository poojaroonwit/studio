const { Pool } = require('pg');
require('dotenv').config();

async function addPositionAttribute() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding positionAttribute column to Position table...');
    
    const client = await pool.connect();
    
    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Position' AND column_name = 'positionAttribute'
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('positionAttribute column already exists');
    } else {
      // Add the column
      const alterQuery = 'ALTER TABLE "Position" ADD COLUMN "positionAttribute" TEXT';
      await client.query(alterQuery);
      console.log('Successfully added positionAttribute column to Position table');
    }
    
    client.release();
  } catch (error) {
    console.error('Error adding positionAttribute column:', error);
  } finally {
    await pool.end();
  }
}

addPositionAttribute();
