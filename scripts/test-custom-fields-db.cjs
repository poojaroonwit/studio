const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testCustomFieldsDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Testing CustomFieldDefinition table structure...');
    
    // Test 1: Check if table exists
    console.log('\n1. Checking if CustomFieldDefinition table exists...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'CustomFieldDefinition'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ CustomFieldDefinition table does not exist');
      return;
    }
    console.log('✅ CustomFieldDefinition table exists');
    
    // Test 2: Check table structure
    console.log('\n2. Checking table structure...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'CustomFieldDefinition'
      ORDER BY ordinal_position;
    `);
    
    console.log('Table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Test 3: Check if required columns exist
    const requiredColumns = [
      'id', 'model_name', 'field_key', 'field_code', 'label', 'field_type',
      'show_in_headcount_detail'
    ];
    
    const existingColumns = columns.rows.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ All required columns exist');
    }
    
    // Test 4: Check if there are any records
    console.log('\n3. Checking for existing records...');
    const recordCount = await client.query(`
      SELECT COUNT(*) as count FROM "CustomFieldDefinition"
    `);
    
    console.log(`Found ${recordCount.rows[0].count} custom field definitions`);
    
    if (recordCount.rows[0].count > 0) {
      // Test 5: Try to fetch a sample record
      console.log('\n4. Testing sample record fetch...');
      const sampleRecord = await client.query(`
        SELECT id, model_name, field_key, field_code, label, field_type
        FROM "CustomFieldDefinition"
        LIMIT 1
      `);
      
      if (sampleRecord.rows.length > 0) {
        console.log('✅ Sample record fetched successfully:');
        console.log(`   - ID: ${sampleRecord.rows[0].id}`);
        console.log(`   - Model: ${sampleRecord.rows[0].model_name}`);
        console.log(`   - Field Key: ${sampleRecord.rows[0].field_key}`);
        console.log(`   - Field Code: ${sampleRecord.rows[0].field_code}`);
        console.log(`   - Label: ${sampleRecord.rows[0].label}`);
        console.log(`   - Type: ${sampleRecord.rows[0].field_type}`);
      }
    }
    
    // Test 6: Test the full query that the API uses
    console.log('\n5. Testing full API query...');
    try {
      const fullQuery = await client.query(`
        SELECT 
          id, model_name, field_key, field_code, label, field_type, options, 
          is_required, sort_order, attribute_code, attribute_label,
          view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
          show_in_full_candidate_detail, show_in_task_board_filter,
          show_in_position_settings, show_in_headcount_detail, allow_custom_options,
          "createdAt", "updatedAt"
        FROM "CustomFieldDefinition"
        ORDER BY sort_order ASC, label ASC
      `);
      
      console.log(`✅ Full query successful - returned ${fullQuery.rows.length} rows`);
      
      if (fullQuery.rows.length > 0) {
        console.log('Sample mapped row:');
        const sampleRow = fullQuery.rows[0];
        const mappedRow = {
          id: sampleRow.id,
          model_name: sampleRow.model_name,
          field_key: sampleRow.field_key,
          field_code: sampleRow.field_code,
          label: sampleRow.label,
          field_type: sampleRow.field_type,
          options: sampleRow.options || [],
          attributeCode: sampleRow.attribute_code,
          attributeLabel: sampleRow.attribute_label,
          viewRoles: sampleRow.view_roles || [],
          editRoles: sampleRow.edit_roles || [],
          showInFilter: sampleRow.show_in_filter || false,
          showInCandidateDetail: sampleRow.show_in_candidate_detail || false,
          showInFullCandidateDetail: sampleRow.show_in_full_candidate_detail || false,
          showInTaskBoardFilter: sampleRow.show_in_task_board_filter || false,
          showInPositionSettings: sampleRow.show_in_position_settings || false,
          showInHeadcountDetail: sampleRow.show_in_headcount_detail || false,
          is_required: sampleRow.is_required,
          allowCustomOptions: sampleRow.allow_custom_options || false,
          sort_order: sampleRow.sort_order ?? 0,
          createdAt: sampleRow.createdAt,
          updatedAt: sampleRow.updatedAt,
        };
        console.log(JSON.stringify(mappedRow, null, 2));
      }
      
    } catch (error) {
      console.log(`❌ Full query failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    client.release();
  }
}

// Run the test
testCustomFieldsDatabase()
  .then(() => {
    console.log('\nDatabase test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database test failed:', error);
    process.exit(1);
  });
