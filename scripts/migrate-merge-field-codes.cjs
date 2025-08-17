const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateMergeFieldCodes() {
  const client = await pool.connect();
  
  try {
    console.log('Starting field code merge migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Step 1: Add the new field_code column
    console.log('Adding field_code column...');
    await client.query('ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS field_code VARCHAR');
    
    // Step 2: Populate field_code with existing field_key values
    console.log('Populating field_code with existing field_key values...');
    await client.query(`
      UPDATE "CustomFieldDefinition" 
      SET field_code = field_key 
      WHERE field_code IS NULL
    `);
    
    // Step 3: Update field_code with attributeCode values where they exist and are different
    console.log('Updating field_code with attributeCode values where they exist...');
    await client.query(`
      UPDATE "CustomFieldDefinition" 
      SET field_code = attribute_code 
      WHERE attribute_code IS NOT NULL 
      AND attribute_code != field_key
    `);
    
    // Step 4: Make field_code NOT NULL
    console.log('Making field_code NOT NULL...');
    await client.query('ALTER TABLE "CustomFieldDefinition" ALTER COLUMN field_code SET NOT NULL');
    
    // Step 5: Add unique constraint on field_code per model
    console.log('Adding unique constraint on field_code per model...');
    try {
      await client.query('ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_model_name_field_code_key" UNIQUE (model_name, field_code)');
    } catch (error) {
      console.log('Unique constraint might already exist or there are duplicates. Checking for duplicates...');
      
      // Check for duplicates
      const duplicates = await client.query(`
        SELECT model_name, field_code, COUNT(*) 
        FROM "CustomFieldDefinition" 
        GROUP BY model_name, field_code 
        HAVING COUNT(*) > 1
      `);
      
      if (duplicates.rows.length > 0) {
        console.log('Found duplicate field_codes:');
        duplicates.rows.forEach(row => {
          console.log(`- ${row.model_name}: ${row.field_code} (${row.count} instances)`);
        });
        throw new Error('Cannot proceed with migration due to duplicate field_codes');
      }
    }
    
    // Step 6: Add index on field_code
    console.log('Adding index on field_code...');
    await client.query('CREATE INDEX IF NOT EXISTS "CustomFieldDefinition_field_code_idx" ON "CustomFieldDefinition" (field_code)');
    
    // Step 7: Drop the old columns (optional - we'll keep them for now for backward compatibility)
    // console.log('Dropping old field_key and attribute_code columns...');
    // await client.query('ALTER TABLE "CustomFieldDefinition" DROP COLUMN IF EXISTS field_key');
    // await client.query('ALTER TABLE "CustomFieldDefinition" DROP COLUMN IF EXISTS attribute_code');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
    
    // Show summary
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_fields,
        COUNT(CASE WHEN field_code = field_key THEN 1 END) as using_field_key,
        COUNT(CASE WHEN field_code = attribute_code THEN 1 END) as using_attribute_code,
        COUNT(CASE WHEN field_code != field_key AND field_code != attribute_code THEN 1 END) as other
      FROM "CustomFieldDefinition"
    `);
    
    console.log('\nMigration Summary:');
    console.log(`Total custom fields: ${summary.rows[0].total_fields}`);
    console.log(`Using field_key as field_code: ${summary.rows[0].using_field_key}`);
    console.log(`Using attribute_code as field_code: ${summary.rows[0].using_attribute_code}`);
    console.log(`Other cases: ${summary.rows[0].other}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateMergeFieldCodes()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateMergeFieldCodes };
