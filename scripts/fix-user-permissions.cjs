const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixUserPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing User Permissions...\n');
    
    // 1. Get all users
    const usersResult = await client.query('SELECT id, name, email, role FROM "User" ORDER BY "createdAt"');
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log(`Processing user: ${user.name} (${user.email})`);
      
      // 2. Get user's group assignments and permissions
      const groupPermissionsResult = await client.query(`
        SELECT array_agg(DISTINCT perm) AS group_permissions
        FROM (
          SELECT unnest(permissions) AS perm
          FROM "UserGroup" ug
          JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
          WHERE uug."userId" = $1
        ) AS perms
      `, [user.id]);
      
      const groupPermissions = groupPermissionsResult.rows[0]?.group_permissions || [];
      
      console.log(`  Group permissions: ${JSON.stringify(groupPermissions)}`);
      
      // 3. Check if user has any group assignments
      const groupAssignmentsResult = await client.query(`
        SELECT ug.name as group_name, ug.id as group_id
        FROM "User_UserGroup" uug
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE uug."userId" = $1
      `, [user.id]);
      
      const groupAssignments = groupAssignmentsResult.rows;
      
      if (groupAssignments.length === 0) {
        console.log(`  ⚠️  User has no group assignments!`);
        
        // Assign to appropriate default group based on role
        let defaultGroupId = null;
        let defaultGroupName = null;
        
        if (user.role === 'Admin') {
          defaultGroupId = '00000000-0000-0000-0000-000000000001';
          defaultGroupName = 'Admin';
        } else if (user.role === 'Recruiter') {
          defaultGroupId = '00000000-0000-0000-0000-000000000002';
          defaultGroupName = 'Recruiter';
        } else if (user.role === 'Hiring Manager') {
          defaultGroupId = '00000000-0000-0000-0000-000000000003';
          defaultGroupName = 'Hiring Manager';
        }
        
        if (defaultGroupId) {
          console.log(`  🔧 Assigning user to ${defaultGroupName} group...`);
          
          // Check if group exists
          const groupExistsResult = await client.query('SELECT id FROM "UserGroup" WHERE id = $1', [defaultGroupId]);
          
          if (groupExistsResult.rows.length > 0) {
            // Add user to group
            await client.query(`
              INSERT INTO "User_UserGroup" ("userId", "groupId")
              VALUES ($1, $2)
              ON CONFLICT ("userId", "groupId") DO NOTHING
            `, [user.id, defaultGroupId]);
            
            console.log(`  ✅ User assigned to ${defaultGroupName} group`);
          } else {
            console.log(`  ❌ Default group ${defaultGroupName} not found!`);
          }
        } else {
          console.log(`  ❌ No default group found for role: ${user.role}`);
        }
      } else {
        console.log(`  ✅ User has ${groupAssignments.length} group assignment(s):`);
        groupAssignments.forEach(group => {
          console.log(`    - ${group.group_name} (${group.group_id})`);
        });
      }
      
      console.log('');
    }
    
    console.log('✅ User permissions fix completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Users may need to sign out and sign back in to refresh their session');
    console.log('2. Or use the "Refresh Permissions" button on the dashboard');
    console.log('3. Check the dashboard to ensure users can now access it');
    
  } catch (error) {
    console.error('❌ Error fixing user permissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixUserPermissions();
