const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateCustomFieldCodes() {
  const client = await pool.connect();
  
  try {
    console.log('Starting custom field code update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Get all custom field definitions that don't have field_code set
    console.log('Finding custom field definitions without field_code...');
    const result = await client.query(`
      SELECT id, model_name, field_key, field_code 
      FROM "CustomFieldDefinition" 
      WHERE field_code IS NULL OR field_code = ''
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ All custom field definitions already have field_code set');
      return;
    }
    
    console.log(`Found ${result.rows.length} custom field definitions to update`);
    
    // Update each record
    for (const row of result.rows) {
      const fieldCode = row.field_key.toUpperCase();
      
      console.log(`Updating ${row.model_name}.${row.field_key} -> field_code: ${fieldCode}`);
      
      await client.query(`
        UPDATE "CustomFieldDefinition" 
        SET field_code = $1, "updatedAt" = NOW()
        WHERE id = $2
      `, [fieldCode, row.id]);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Successfully updated all custom field definitions');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating custom field codes:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the update
updateCustomFieldCodes()
  .then(() => {
    console.log('Custom field code update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Custom field code update failed:', error);
    process.exit(1);
  });
