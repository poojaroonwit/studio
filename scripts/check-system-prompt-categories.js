const { Pool } = require('pg');

async function checkSystemPromptCategories() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    // Check if SystemPromptCategory table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SystemPromptCategory'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ SystemPromptCategory table does not exist');
      return;
    }
    
    // Check if there are any categories
    const categories = await client.query(`
      SELECT id, name, description, is_active 
      FROM "SystemPromptCategory" 
      ORDER BY name
    `);
    
    console.log(`📊 Found ${categories.rows.length} system prompt categories:`);
    
    if (categories.rows.length === 0) {
      console.log('❌ No categories found. You need to create at least one category first.');
      console.log('💡 Go to Settings > System Prompt Categories to create a category.');
    } else {
      categories.rows.forEach((category, index) => {
        console.log(`${index + 1}. ${category.name} (${category.is_active ? 'Active' : 'Inactive'})`);
        if (category.description) {
          console.log(`   Description: ${category.description}`);
        }
      });
    }
    
    // Check if there are any system prompts
    const prompts = await client.query(`
      SELECT COUNT(*) as count FROM "SystemPrompt"
    `);
    
    console.log(`\n📝 Found ${prompts.rows[0].count} system prompts`);
    
    client.release();
  } catch (error) {
    console.error('❌ Error checking system prompt categories:', error.message);
  } finally {
    await pool.end();
  }
}

checkSystemPromptCategories();
