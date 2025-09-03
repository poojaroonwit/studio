const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'studio9',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function debugPositionPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('=== Debugging Position Permissions ===\n');
    
    // 1. Check if there are any users with POSITIONS_EDIT_BASIC permission
    console.log('1. Checking users with POSITIONS_EDIT_BASIC permission:');
    const usersWithPermission = await client.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role,
        ug.name as userGroupName,
        ug.permissions
      FROM "User" u
      JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE 'POSITIONS_EDIT_BASIC' = ANY(ug.permissions)
      ORDER BY u.name
    `);
    
    if (usersWithPermission.rows.length === 0) {
      console.log('   ❌ No users found with POSITIONS_EDIT_BASIC permission');
    } else {
      console.log(`   ✅ Found ${usersWithPermission.rows.length} users with POSITIONS_EDIT_BASIC permission:`);
      usersWithPermission.rows.forEach(user => {
        console.log(`      - ${user.name} (${user.email}) - Role: ${user.role} - Group: ${user.userGroupName}`);
        console.log(`        Permissions: [${user.permissions.join(', ')}]`);
      });
    }
    
    console.log('\n2. Checking all user groups and their permissions:');
    const allUserGroups = await client.query(`
      SELECT 
        ug.id,
        ug.name,
        ug.permissions,
        COUNT(u.id) as userCount
      FROM "UserGroup" ug
      LEFT JOIN "User" u ON ug.id = u."userGroupId"
      GROUP BY ug.id, ug.name, ug.permissions
      ORDER BY ug.name
    `);
    
    allUserGroups.rows.forEach(group => {
      console.log(`   - ${group.name} (${group.userCount} users): [${group.permissions.join(', ')}]`);
    });
    
    console.log('\n3. Checking specific user by email (if provided):');
    const testEmail = process.argv[2];
    if (testEmail) {
      const specificUser = await client.query(`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.role,
          ug.name as userGroupName,
          ug.permissions
        FROM "User" u
        JOIN "UserGroup" ug ON u."userGroupId" = ug.id
        WHERE u.email = $1
      `, [testEmail]);
      
      if (specificUser.rows.length === 0) {
        console.log(`   ❌ No user found with email: ${testEmail}`);
      } else {
        const user = specificUser.rows[0];
        console.log(`   ✅ User found: ${user.name} (${user.email})`);
        console.log(`      Role: ${user.role}`);
        console.log(`      User Group: ${user.userGroupName}`);
        console.log(`      Permissions: [${user.permissions.join(', ')}]`);
        console.log(`      Has POSITIONS_EDIT_BASIC: ${user.permissions.includes('POSITIONS_EDIT_BASIC')}`);
      }
    }
    
    console.log('\n4. Checking permission constants:');
    const permissionConstants = await client.query(`
      SELECT 
        pm.id,
        pm.label,
        pm.category
      FROM "PlatformModule" pm
      WHERE pm.id LIKE 'POSITIONS_%'
      ORDER BY pm.id
    `);
    
    console.log('   Available POSITIONS permissions:');
    permissionConstants.rows.forEach(perm => {
      console.log(`      - ${perm.id}: ${perm.label} (${perm.category})`);
    });
    
  } catch (error) {
    console.error('Error debugging permissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the debug function
debugPositionPermissions().catch(console.error);
