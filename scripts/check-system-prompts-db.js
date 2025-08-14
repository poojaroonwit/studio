const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkSystemPromptsDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 Checking System Prompts Database State...\n');
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('SystemPrompt', 'SystemPromptCategory')
      ORDER BY table_name
    `);
    
    console.log('📋 Existing tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    if (tables.rows.length === 0) {
      console.log('❌ No SystemPrompt or SystemPromptCategory tables found!');
      console.log('💡 You need to run database migrations: npx prisma migrate deploy');
      return;
    }
    
    // Check SystemPrompt table structure
    if (tables.rows.some(row => row.table_name === 'SystemPrompt')) {
      console.log('\n📝 SystemPrompt table structure:');
      const systemPromptColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'SystemPrompt' 
        ORDER BY ordinal_position
      `);
      
      systemPromptColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
      });
      
      // Check SystemPrompt data
      const systemPromptCount = await client.query('SELECT COUNT(*) as count FROM "SystemPrompt"');
      console.log(`\n📊 SystemPrompt records: ${systemPromptCount.rows[0].count}`);
      
      if (systemPromptCount.rows[0].count > 0) {
        const samplePrompts = await client.query('SELECT id, name, "categoryId", category FROM "SystemPrompt" LIMIT 3');
        console.log('Sample records:');
        samplePrompts.rows.forEach(prompt => {
          console.log(`  - ${prompt.name} (categoryId: ${prompt.categoryId}, category: ${prompt.category})`);
        });
      }
    }
    
    // Check SystemPromptCategory table structure
    if (tables.rows.some(row => row.table_name === 'SystemPromptCategory')) {
      console.log('\n📂 SystemPromptCategory table structure:');
      const categoryColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'SystemPromptCategory' 
        ORDER BY ordinal_position
      `);
      
      categoryColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
      });
      
      // Check SystemPromptCategory data
      const categoryCount = await client.query('SELECT COUNT(*) as count FROM "SystemPromptCategory"');
      console.log(`\n📊 SystemPromptCategory records: ${categoryCount.rows[0].count}`);
      
      if (categoryCount.rows[0].count > 0) {
        const categories = await client.query('SELECT id, name, description FROM "SystemPromptCategory"');
        console.log('Categories:');
        categories.rows.forEach(category => {
          console.log(`  - ${category.name} (${category.description || 'No description'})`);
        });
      } else {
        console.log('❌ No categories found! This is why system prompts are failing.');
        console.log('💡 You need to create at least one category first.');
      }
    }
    
    // Check foreign key constraints
    console.log('\n🔗 Foreign key constraints:');
    const foreignKeys = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('SystemPrompt', 'SystemPromptCategory')
    `);
    
    foreignKeys.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Database connection failed. Make sure PostgreSQL is running.');
      console.log('   For Docker: docker-compose up -d postgres');
    }
  } finally {
    await pool.end();
  }
}

checkSystemPromptsDatabase();
