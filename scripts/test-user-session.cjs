const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testUserSession() {
  const client = await pool.connect();
  
  try {
    console.log('Testing user session and permissions...');
    
    // Get all users with their roles and permissions
    console.log('\n1. Checking users and their permissions...');
    const users = await client.query(`
      SELECT 
        id, 
        name, 
        email, 
        role, 
        "module_permissions",
        "createdAt",
        "updatedAt"
      FROM "User"
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    
    console.log(`Found ${users.rows.length} users:`);
    users.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.email})`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Module Permissions: ${user.module_permissions ? user.module_permissions.join(', ') : 'None'}`);
      console.log(`   - Created: ${user.createdAt}`);
    });
    
    // Check if there are any Admin users
    const adminUsers = users.rows.filter(user => user.role === 'Admin');
    console.log(`\nAdmin users: ${adminUsers.length}`);
    
    // Check if there are any users with CUSTOM_FIELDS_MANAGE permission
    const customFieldsUsers = users.rows.filter(user => 
      user.module_permissions && user.module_permissions.includes('CUSTOM_FIELDS_MANAGE')
    );
    console.log(`Users with CUSTOM_FIELDS_MANAGE permission: ${customFieldsUsers.length}`);
    
    // Check what permissions exist in the system
    console.log('\n2. Checking all unique module permissions in the system...');
    const allPermissions = new Set();
    users.rows.forEach(user => {
      if (user.module_permissions) {
        user.module_permissions.forEach(permission => allPermissions.add(permission));
      }
    });
    
    console.log('All module permissions found:');
    Array.from(allPermissions).sort().forEach(permission => {
      console.log(`   - ${permission}`);
    });
    
    // Check if CUSTOM_FIELDS_MANAGE permission exists
    if (allPermissions.has('CUSTOM_FIELDS_MANAGE')) {
      console.log('\n✅ CUSTOM_FIELDS_MANAGE permission exists in the system');
    } else {
      console.log('\n❌ CUSTOM_FIELDS_MANAGE permission does not exist in the system');
    }
    
    // Test creating a user with CUSTOM_FIELDS_MANAGE permission if none exists
    if (customFieldsUsers.length === 0 && adminUsers.length === 0) {
      console.log('\n3. No users with proper permissions found. Creating test user...');
      
      // Create a test user with CUSTOM_FIELDS_MANAGE permission
      const testUser = await client.query(`
        INSERT INTO "User" (
          id, name, email, role, "module_permissions", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), 
          'Test Admin', 
          'test@example.com', 
          'Admin', 
          ARRAY['CUSTOM_FIELDS_MANAGE'], 
          NOW(), 
          NOW()
        ) RETURNING *
      `);
      
      console.log('✅ Created test admin user with CUSTOM_FIELDS_MANAGE permission');
      console.log(`   - ID: ${testUser.rows[0].id}`);
      console.log(`   - Email: ${testUser.rows[0].email}`);
      console.log(`   - Role: ${testUser.rows[0].role}`);
      console.log(`   - Permissions: ${testUser.rows[0].module_permissions.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ User session test failed:', error);
  } finally {
    client.release();
  }
}

// Run the test
testUserSession()
  .then(() => {
    console.log('\nUser session test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('User session test failed:', error);
    process.exit(1);
  });
