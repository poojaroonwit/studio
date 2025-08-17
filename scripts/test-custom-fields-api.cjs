const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testCustomFieldsAPI() {
  const client = await pool.connect();
  
  try {
    console.log('Testing custom field definitions API logic...');
    
    // Simulate the API logic without authentication
    console.log('\n1. Testing database query...');
    
    const query = `
      SELECT 
        id, model_name, field_key, field_code, label, field_type, options, 
        is_required, sort_order, attribute_code, attribute_label,
        view_roles, edit_roles, show_in_filter, show_in_candidate_detail,
        show_in_full_candidate_detail, show_in_task_board_filter,
        show_in_position_settings, show_in_headcount_detail, allow_custom_options,
        "createdAt", "updatedAt"
      FROM "CustomFieldDefinition"
      ORDER BY sort_order ASC, label ASC
    `;
    
    const result = await client.query(query);
    console.log(`✅ Query successful - returned ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      console.log('\n2. Testing data mapping...');
      
      const mappedRows = result.rows.map(row => ({
        id: row.id,
        model_name: row.model_name,
        field_key: row.field_key,
        field_code: row.field_code,
        label: row.label,
        field_type: row.field_type,
        options: row.options || [],
        attributeCode: row.attribute_code,
        attributeLabel: row.attribute_label,
        viewRoles: row.view_roles || [],
        editRoles: row.edit_roles || [],
        showInFilter: row.show_in_filter || false,
        showInCandidateDetail: row.show_in_candidate_detail || false,
        showInFullCandidateDetail: row.show_in_full_candidate_detail || false,
        showInTaskBoardFilter: row.show_in_task_board_filter || false,
        showInPositionSettings: row.show_in_position_settings || false,
        showInHeadcountDetail: row.show_in_headcount_detail || false,
        is_required: row.is_required,
        allowCustomOptions: row.allow_custom_options || false,
        sort_order: row.sort_order ?? 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
      
      console.log('✅ Data mapping successful');
      console.log('Sample mapped row:');
      console.log(JSON.stringify(mappedRows[0], null, 2));
    }
    
    // Test permission logic
    console.log('\n3. Testing permission logic...');
    
    // Get Admin user
    const adminUser = await client.query(`
      SELECT id, name, email, role, "module_permissions"
      FROM "User"
      WHERE role = 'Admin'
      LIMIT 1
    `);
    
    if (adminUser.rows.length > 0) {
      const user = adminUser.rows[0];
      console.log(`Testing with user: ${user.name} (${user.email})`);
      console.log(`Role: ${user.role}`);
      console.log(`Module Permissions: ${user.module_permissions ? user.module_permissions.join(', ') : 'None'}`);
      
      // Test the permission check logic
      const hasAdminRole = user.role === 'Admin';
      const hasCustomFieldsPermission = user.module_permissions && user.module_permissions.includes('CUSTOM_FIELDS_MANAGE');
      const canAccess = hasAdminRole || hasCustomFieldsPermission;
      
      console.log(`\nPermission check results:`);
      console.log(`  - Has Admin role: ${hasAdminRole}`);
      console.log(`  - Has CUSTOM_FIELDS_MANAGE permission: ${hasCustomFieldsPermission}`);
      console.log(`  - Can access: ${canAccess}`);
      
      if (canAccess) {
        console.log('✅ User has permission to access custom field definitions');
      } else {
        console.log('❌ User does not have permission to access custom field definitions');
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  } finally {
    client.release();
  }
}

// Run the test
testCustomFieldsAPI()
  .then(() => {
    console.log('\nCustom fields API test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Custom fields API test failed:', error);
    process.exit(1);
  });
