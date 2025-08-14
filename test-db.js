const { Pool } = require('pg');

async function testDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 Testing database connection and tables...\n');
    
    // Test 1: Check if SystemPromptCategory table exists
    console.log('1. Checking if SystemPromptCategory table exists...');
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'SystemPromptCategory'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('✅ SystemPromptCategory table exists');
      } else {
        console.log('❌ SystemPromptCategory table does not exist');
        return;
      }
    } catch (error) {
      console.log('❌ Error checking table:', error.message);
      return;
    }
    
    // Test 2: Check table structure
    console.log('\n2. Checking table structure...');
    try {
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'SystemPromptCategory' 
        ORDER BY ordinal_position
      `);
      
      console.log('Columns found:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
      });
    } catch (error) {
      console.log('❌ Error checking columns:', error.message);
    }
    
    // Test 3: Try to insert a test category
    console.log('\n3. Testing category creation...');
    try {
      const testResult = await client.query(`
        INSERT INTO "SystemPromptCategory" (id, name, description, color, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Test Category', 'Test Description', '#FF0000', true, NOW(), NOW())
        RETURNING id, name
      `);
      
      console.log('✅ Successfully created test category:', testResult.rows[0]);
      
      // Clean up - delete the test category
      await client.query(`DELETE FROM "SystemPromptCategory" WHERE id = $1`, [testResult.rows[0].id]);
      console.log('✅ Test category cleaned up');
      
    } catch (error) {
      console.log('❌ Error creating test category:', error.message);
      console.log('Error details:', error);
    }
    
    // Test 4: Check if SystemPrompt table exists
    console.log('\n4. Checking if SystemPrompt table exists...');
    try {
      const promptTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'SystemPrompt'
        );
      `);
      
      if (promptTableCheck.rows[0].exists) {
        console.log('✅ SystemPrompt table exists');
      } else {
        console.log('❌ SystemPrompt table does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking SystemPrompt table:', error.message);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
