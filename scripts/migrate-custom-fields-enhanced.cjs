#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateCustomFieldsEnhanced() {
  const client = await pool.connect();
  
  try {
    console.log('Starting enhanced custom fields migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Add new columns to CustomFieldDefinition table
    console.log('Adding new columns to CustomFieldDefinition table...');
    
    const alterQueries = [
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS attribute_code VARCHAR',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS attribute_label VARCHAR',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS view_roles VARCHAR[] DEFAULT \'{}\'',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS edit_roles VARCHAR[] DEFAULT \'{}\'',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS show_in_filter BOOLEAN DEFAULT FALSE',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS show_in_candidate_detail BOOLEAN DEFAULT FALSE',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS show_in_full_candidate_detail BOOLEAN DEFAULT FALSE',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS show_in_task_board_filter BOOLEAN DEFAULT FALSE',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS show_in_position_settings BOOLEAN DEFAULT FALSE',
      'ALTER TABLE "CustomFieldDefinition" ADD COLUMN IF NOT EXISTS allow_custom_options BOOLEAN DEFAULT FALSE',
    ];
    
    for (const query of alterQueries) {
      await client.query(query);
      console.log(`Executed: ${query}`);
    }
    
    // Create CustomFieldOption table
    console.log('Creating CustomFieldOption table...');
    
    const createOptionsTable = `
      CREATE TABLE IF NOT EXISTS "CustomFieldOption" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        custom_field_definition_id UUID NOT NULL REFERENCES "CustomFieldDefinition"(id) ON DELETE CASCADE,
        value VARCHAR NOT NULL,
        label VARCHAR NOT NULL,
        color VARCHAR DEFAULT '#3B82F6',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(custom_field_definition_id, value)
      );
    `;
    
    await client.query(createOptionsTable);
    console.log('CustomFieldOption table created');
    
    // Create indexes
    console.log('Creating indexes...');
    
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_custom_field_option_field_id ON "CustomFieldOption"(custom_field_definition_id)',
      'CREATE INDEX IF NOT EXISTS idx_custom_field_option_sort_order ON "CustomFieldOption"(sort_order)',
      'CREATE INDEX IF NOT EXISTS idx_custom_field_option_active ON "CustomFieldOption"(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_custom_field_def_view_roles ON "CustomFieldDefinition"(view_roles)',
      'CREATE INDEX IF NOT EXISTS idx_custom_field_def_edit_roles ON "CustomFieldDefinition"(edit_roles)',
    ];
    
    for (const query of indexQueries) {
      await client.query(query);
      console.log(`Created index: ${query}`);
    }
    
    // Update existing records to have default values
    console.log('Updating existing records with default values...');
    
    const updateDefaults = `
      UPDATE "CustomFieldDefinition" 
      SET 
        view_roles = COALESCE(view_roles, '{}'),
        edit_roles = COALESCE(edit_roles, '{}'),
        show_in_filter = COALESCE(show_in_filter, FALSE),
        show_in_candidate_detail = COALESCE(show_in_candidate_detail, FALSE),
        show_in_full_candidate_detail = COALESCE(show_in_full_candidate_detail, FALSE),
        show_in_task_board_filter = COALESCE(show_in_task_board_filter, FALSE),
        show_in_position_settings = COALESCE(show_in_position_settings, FALSE),
        allow_custom_options = COALESCE(allow_custom_options, FALSE)
      WHERE view_roles IS NULL 
         OR edit_roles IS NULL 
         OR show_in_filter IS NULL 
         OR show_in_candidate_detail IS NULL 
         OR show_in_full_candidate_detail IS NULL 
         OR show_in_task_board_filter IS NULL 
         OR show_in_position_settings IS NULL 
         OR allow_custom_options IS NULL;
    `;
    
    const updateResult = await client.query(updateDefaults);
    console.log(`Updated ${updateResult.rowCount} records with default values`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Enhanced custom fields migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateCustomFieldsEnhanced()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCustomFieldsEnhanced };
