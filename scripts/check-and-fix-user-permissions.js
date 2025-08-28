require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkAndFixUserPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Checking and Fixing User Permissions...\n');
    
    // 1. Get all users
    const usersResult = await client.query('SELECT id, name, email, role FROM "User" ORDER BY "createdAt"');
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users:\n`);
    
    let fixedUsers = 0;
    let totalUsers = 0;
    
    for (const user of users) {
      totalUsers++;
      console.log(`Processing user: ${user.name} (${user.email}) - Role: ${user.role}`);
      
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
      
      console.log(`  Current permissions: ${JSON.stringify(groupPermissions)}`);
      
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
            fixedUsers++;
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
      
      // 4. Check if user has any permissions
      if (groupPermissions.length === 0) {
        console.log(`  ⚠️  User has no permissions!`);
        
        // Check if this is because they're not in any groups
        if (groupAssignments.length === 0) {
          console.log(`  🔧 This will be fixed by group assignment above`);
        } else {
          console.log(`  ⚠️  User is in groups but has no permissions - check group permissions`);
        }
      } else {
        console.log(`  ✅ User has ${groupPermissions.length} permissions`);
      }
      
      console.log('');
    }
    
    console.log('📊 Summary:');
    console.log(`  Total users processed: ${totalUsers}`);
    console.log(`  Users fixed: ${fixedUsers}`);
    console.log(`  Users already correct: ${totalUsers - fixedUsers}`);
    
    if (fixedUsers > 0) {
      console.log('\n✅ User permissions fix completed!');
      console.log('💡 Users should now be able to access the dashboard or be redirected to my-tasks appropriately.');
    } else {
      console.log('\n✅ All users already have correct permissions!');
    }
    
  } catch (error) {
    console.error('❌ Error checking/fixing user permissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndFixUserPermissions().catch(console.error);
