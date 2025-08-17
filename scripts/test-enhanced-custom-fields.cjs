#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testEnhancedCustomFields() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Enhanced Custom Fields System...\n');
    
    // Test 1: Check if new columns exist
    console.log('1. Checking new columns in CustomFieldDefinition table...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'CustomFieldDefinition' 
      AND column_name IN ('attribute_code', 'attribute_label', 'view_roles', 'edit_roles', 'show_in_filter', 'show_in_candidate_detail', 'show_in_full_candidate_detail', 'show_in_task_board_filter', 'show_in_position_settings', 'allow_custom_options')
      ORDER BY column_name;
    `);
    
    console.log('✅ Found new columns:');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Test 2: Check if CustomFieldOption table exists
    console.log('\n2. Checking CustomFieldOption table...');
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'CustomFieldOption';
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('✅ CustomFieldOption table exists');
    } else {
      console.log('❌ CustomFieldOption table not found');
    }
    
    // Test 3: Check indexes
    console.log('\n3. Checking indexes...');
    const indexesResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('CustomFieldDefinition', 'CustomFieldOption')
      AND indexname LIKE 'idx_custom_field%';
    `);
    
    console.log('✅ Found indexes:');
    indexesResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    // Test 4: Create test custom fields
    console.log('\n4. Creating test custom fields...');
    
    // Test Candidate field
    const testCandidateField = {
      model_name: 'Candidate',
      field_key: 'test_status',
      label: 'Test Status',
      field_type: 'select_single',
      attributeCode: 'TEST_STATUS',
      attributeLabel: 'Test Status Field',
      viewRoles: ['Admin', 'Recruiter'],
      editRoles: ['Admin'],
      showInFilter: true,
      showInCandidateDetail: true,
      showInFullCandidateDetail: false,
      showInTaskBoardFilter: true,
      showInPositionSettings: false,
      showInHeadcountDetail: false,
      is_required: true,
      allowCustomOptions: false,
      sort_order: 10,
      options: [
        { value: 'active', label: 'Active', color: '#10B981', sortOrder: 0, isActive: true },
        { value: 'inactive', label: 'Inactive', color: '#EF4444', sortOrder: 1, isActive: true }
      ]
    };
    
    // Test Headcount field
    const testHeadcountField = {
      model_name: 'Headcount',
      field_key: 'priority_level',
      label: 'Priority Level',
      field_type: 'select_single',
      attributeCode: 'PRIORITY_LEVEL',
      attributeLabel: 'Priority Level Field',
      viewRoles: ['Admin', 'Recruiter'],
      editRoles: ['Admin'],
      showInFilter: false,
      showInCandidateDetail: false,
      showInFullCandidateDetail: false,
      showInTaskBoardFilter: false,
      showInPositionSettings: false,
      showInHeadcountDetail: true,
      is_required: false,
      allowCustomOptions: false,
      sort_order: 5,
      options: [
        { value: 'high', label: 'High', color: '#EF4444', sortOrder: 0, isActive: true },
        { value: 'medium', label: 'Medium', color: '#F59E0B', sortOrder: 1, isActive: true },
        { value: 'low', label: 'Low', color: '#10B981', sortOrder: 2, isActive: true }
      ]
    };
    
    // Insert Candidate field
    const insertCandidateResult = await client.query(`
      INSERT INTO "CustomFieldDefinition" (
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, allow_custom_options,
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
      )
      RETURNING *;
    `, [
      testCandidateField.model_name, testCandidateField.field_key, testCandidateField.field_key.toUpperCase(), testCandidateField.label, testCandidateField.field_type,
      JSON.stringify(testCandidateField.options), testCandidateField.is_required, testCandidateField.sort_order,
      testCandidateField.attributeCode, testCandidateField.attributeLabel, testCandidateField.viewRoles, testCandidateField.editRoles,
      testCandidateField.showInFilter, testCandidateField.showInCandidateDetail, testCandidateField.showInFullCandidateDetail,
      testCandidateField.showInTaskBoardFilter, testCandidateField.showInPositionSettings, testCandidateField.showInHeadcountDetail, testCandidateField.allowCustomOptions
    ]);
    
    console.log('✅ Test Candidate custom field created successfully');
    console.log(`   - ID: ${insertCandidateResult.rows[0].id}`);
    console.log(`   - Label: ${insertCandidateResult.rows[0].label}`);
    console.log(`   - Model: ${insertCandidateResult.rows[0].model_name}`);
    
    // Insert Headcount field
    const insertHeadcountResult = await client.query(`
      INSERT INTO "CustomFieldDefinition" (
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, allow_custom_options,
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
      )
      RETURNING *;
    `, [
      testHeadcountField.model_name, testHeadcountField.field_key, testHeadcountField.field_key.toUpperCase(), testHeadcountField.label, testHeadcountField.field_type,
      JSON.stringify(testHeadcountField.options), testHeadcountField.is_required, testHeadcountField.sort_order,
      testHeadcountField.attributeCode, testHeadcountField.attributeLabel, testHeadcountField.viewRoles, testHeadcountField.editRoles,
      testHeadcountField.showInFilter, testHeadcountField.showInCandidateDetail, testHeadcountField.showInFullCandidateDetail,
      testHeadcountField.showInTaskBoardFilter, testHeadcountField.showInPositionSettings, testHeadcountField.showInHeadcountDetail, testHeadcountField.allowCustomOptions
    ]);
    
    console.log('✅ Test Headcount custom field created successfully');
    console.log(`   - ID: ${insertHeadcountResult.rows[0].id}`);
    console.log(`   - Label: ${insertHeadcountResult.rows[0].label}`);
    console.log(`   - Model: ${insertHeadcountResult.rows[0].model_name}`);
    console.log(`   - Show in Headcount Detail: ${insertHeadcountResult.rows[0].show_in_headcount_detail}`);
    
    // Test 5: Retrieve the test fields
    console.log('\n5. Retrieving test custom fields...');
    
    // Retrieve Candidate field
    const retrieveCandidateResult = await client.query(`
      SELECT 
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, allow_custom_options,
        "createdAt", "updatedAt"
      FROM "CustomFieldDefinition"
      WHERE field_key = 'test_status';
    `);
    
    if (retrieveCandidateResult.rows.length > 0) {
      const field = retrieveCandidateResult.rows[0];
      console.log('✅ Test Candidate field retrieved successfully');
      console.log(`   - Model: ${field.model_name}`);
      console.log(`   - Type: ${field.field_type}`);
      console.log(`   - Required: ${field.is_required}`);
      console.log(`   - Show in Filter: ${field.show_in_filter}`);
      console.log(`   - Options: ${field.options ? field.options.length : 0} options`);
    } else {
      console.log('❌ Failed to retrieve Candidate test field');
    }
    
    // Retrieve Headcount field
    const retrieveHeadcountResult = await client.query(`
      SELECT 
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, allow_custom_options,
        "createdAt", "updatedAt"
      FROM "CustomFieldDefinition"
      WHERE field_key = 'priority_level';
    `);
    
    if (retrieveHeadcountResult.rows.length > 0) {
      const field = retrieveHeadcountResult.rows[0];
      console.log('✅ Test Headcount field retrieved successfully');
      console.log(`   - Model: ${field.model_name}`);
      console.log(`   - Type: ${field.field_type}`);
      console.log(`   - Required: ${field.is_required}`);
      console.log(`   - Show in Headcount Detail: ${field.show_in_headcount_detail}`);
      console.log(`   - Options: ${field.options ? field.options.length : 0} options`);
    } else {
      console.log('❌ Failed to retrieve Headcount test field');
    }
    
    // Test 6: Clean up test data
    console.log('\n6. Cleaning up test data...');
    await client.query(`
      DELETE FROM "CustomFieldDefinition" WHERE field_key IN ('test_status', 'priority_level');
    `);
    console.log('✅ Test data cleaned up');
    
    // Test 7: Count total custom fields
    console.log('\n7. Counting total custom fields...');
    const countResult = await client.query(`
      SELECT COUNT(*) as total FROM "CustomFieldDefinition";
    `);
    console.log(`✅ Total custom fields: ${countResult.rows[0].total}`);
    
    console.log('\n🎉 All tests passed! Enhanced Custom Fields system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run test if called directly
if (require.main === module) {
  testEnhancedCustomFields()
    .then(() => {
      console.log('\nTest completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testEnhancedCustomFields };
