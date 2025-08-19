const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addGradeLabel() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding label column to Grade table...');
    
    // Add label column to Grade table
    await client.query(`
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "label" TEXT;
    `);

    // Update existing grades with default labels based on their names
    await client.query(`
      UPDATE "Grade" 
      SET "label" = CASE 
        WHEN name = 'Grade 8+' THEN 'Senior Executive'
        WHEN name = 'Grade 6-7' THEN 'Manager'
        WHEN name = 'Grade 3-5' THEN 'Senior Staff'
        WHEN name = 'Grade 1-2 & Contract' THEN 'Staff & Contract'
        ELSE name
      END
      WHERE "label" IS NULL;
    `);

    console.log('✅ Label column added to Grade table successfully!');
    
    // Verify the changes
    const result = await client.query('SELECT name, label FROM "Grade" ORDER BY "sort_order"');
    console.log('📋 Current grades with labels:');
    result.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.label || 'No label'}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding label column:', error);
    throw error;
  } finally {
    client.release();
  }
}

addGradeLabel()
  .then(() => {
    console.log('🎉 Grade label setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
