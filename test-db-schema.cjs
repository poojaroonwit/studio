const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function testDatabaseSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secure_password@localhost:8521/studio_production'
  });

  try {
    console.log('=== Testing Database Connection ===');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check Candidate table schema
    console.log('\n=== Candidate Table Schema ===');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Candidate' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns:');
    schemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    
    // Try a simple insert test
    console.log('\n=== Testing Simple Insert ===');
    const testId = uuidv4();
    const testData = {
      id: testId,
      name: 'Test Candidate',
      email: `test-${Date.now()}@example.com`,
      status: 'new',
      parsedData: { test: true },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Test data:', testData);
    
    const insertResult = await client.query(`
      INSERT INTO "Candidate" (id, name, email, status, "parsedData", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, "createdAt", "updatedAt";
    `, [testData.id, testData.name, testData.email, testData.status, JSON.stringify(testData.parsedData), testData.createdAt, testData.updatedAt]);
    
    console.log('✅ Insert successful:', insertResult.rows[0]);
    
    // Clean up test data
    await client.query('DELETE FROM "Candidate" WHERE id = $1', [testId]);
    console.log('✅ Test data cleaned up');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testDatabaseSchema(); 