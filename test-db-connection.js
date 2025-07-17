const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', databaseUrl ? 'Set' : 'Not set');
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set.');
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test if Position table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Position'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Position table exists');
      
      // Test inserting a position
      const testPosition = {
        id: 'test-' + Date.now(),
        title: 'Test Position',
        department: 'Test Department',
        description: 'Test Description',
        isOpen: true,
        positionLevel: 'Test Level',
        customAttributes: {}
      };
      
      try {
        const insertResult = await client.query(`
          INSERT INTO "Position" (id, title, department, description, "isOpen", "positionLevel", "customAttributes", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING *;
        `, [
          testPosition.id,
          testPosition.title,
          testPosition.department,
          testPosition.description,
          testPosition.isOpen,
          testPosition.positionLevel,
          testPosition.customAttributes
        ]);
        
        console.log('✅ Position insert test successful');
        console.log('Inserted position:', insertResult.rows[0]);
        
        // Clean up test data
        await client.query('DELETE FROM "Position" WHERE id = $1', [testPosition.id]);
        console.log('✅ Test position cleaned up');
        
      } catch (insertError) {
        console.error('❌ Position insert test failed:', insertError.message);
        console.error('Error details:', insertError);
      }
      
    } else {
      console.error('❌ Position table does not exist');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testDatabaseConnection(); 