require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function showDatabasePermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 How Permissions Are Stored in Database\n');
    
    // 1. Show UserGroup table structure
    console.log('📋 1. UserGroup Table Structure:');
    console.log('   - id: UUID (Primary Key)');
    console.log('   - name: String (Role name like "Admin", "Recruiter")');
    console.log('   - permissions: String[] (Array of permission strings)');
    console.log('   - isDefault: Boolean');
    console.log('   - isSystemRole: Boolean');
    console.log('');
    
    // 2. Show actual permissions in database
    const groupsResult = await client.query(`
      SELECT name, permissions, "is_default", "is_system_role"
      FROM "UserGroup" 
      ORDER BY name
    `);
    
    console.log('📊 2. Actual Permissions in Database:');
    groupsResult.rows.forEach(group => {
      console.log(`\n${group.name} (${group.is_default ? 'Default' : 'Custom'} ${group.is_system_role ? 'System' : 'User'} Role):`);
      console.log(`  ${group.permissions.length} permissions:`);
      group.permissions.forEach(perm => {
        console.log(`    - ${perm}`);
      });
    });
    
    console.log('\n📋 3. User_UserGroup Table (Links Users to Roles):');
    console.log('   - userId: UUID (References User.id)');
    console.log('   - groupId: UUID (References UserGroup.id)');
    console.log('   - This creates the many-to-many relationship');
    console.log('');
    
    // 4. Show user assignments
    const userAssignmentsResult = await client.query(`
      SELECT u.name as user_name, u.role, ug.name as group_name
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
      LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
      ORDER BY u.name
    `);
    
    console.log('👥 4. User Role Assignments:');
    userAssignmentsResult.rows.forEach(user => {
      console.log(`  ${user.user_name}:`);
      console.log(`    Role field: ${user.role}`);
      console.log(`    Group assignment: ${user.group_name || 'None'}`);
    });
    
    console.log('\n💡 5. How It Works:');
    console.log('   - Permissions are stored as strings in the UserGroup.permissions array');
    console.log('   - Users are linked to groups via User_UserGroup table');
    console.log('   - When checking permissions, the system:');
    console.log('     1. Finds all groups a user belongs to');
    console.log('     2. Collects all permissions from those groups');
    console.log('     3. Checks if the required permission exists');
    console.log('');
    
    console.log('🔧 6. Example Permission Check Query:');
    console.log(`
      SELECT array_agg(DISTINCT perm) AS user_permissions
      FROM (
        SELECT unnest(permissions) AS perm
        FROM "UserGroup" ug
        JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
        WHERE uug."userId" = $1
      ) AS perms
    `);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

showDatabasePermissions().catch(console.error);
