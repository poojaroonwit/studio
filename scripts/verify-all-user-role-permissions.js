require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Define role to group ID mappings
const ROLE_TO_GROUP_ID = {
  'Admin': '00000000-0000-0000-0000-000000000001',
  'Recruiter': '00000000-0000-0000-0000-000000000002',
  'Hiring Manager': '00000000-0000-0000-0000-000000000003'
};

async function verifyAllUserRolePermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying All User Role Permissions...\n');
    
    // 1. Get all users with their roles
    const usersResult = await client.query(`
      SELECT id, name, email, role, "createdAt" 
      FROM "User" 
      ORDER BY "createdAt"
    `);
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users:\n`);
    
    // 2. Get all user groups and their permissions
    const groupsResult = await client.query(`
      SELECT id, name, permissions 
      FROM "UserGroup" 
      ORDER BY name
    `);
    const groups = groupsResult.rows;
    
    console.log('📋 Available User Groups:');
    groups.forEach(group => {
      console.log(`  - ${group.name} (${group.id}): ${group.permissions.length} permissions`);
    });
    console.log('');
    
    // 3. Create a mapping of expected permissions for each role based on actual group permissions
    const expectedPermissionsByRole = {};
    for (const group of groups) {
      if (group.name === 'Admin') {
        expectedPermissionsByRole['Admin'] = group.permissions;
      } else if (group.name === 'Recruiter') {
        expectedPermissionsByRole['Recruiter'] = group.permissions;
      } else if (group.name === 'Hiring Manager') {
        expectedPermissionsByRole['Hiring Manager'] = group.permissions;
      }
    }
    
    // 4. Analyze each user
    const analysis = {
      totalUsers: users.length,
      usersByRole: {},
      issues: [],
      fixedUsers: 0
    };
    
    for (const user of users) {
      console.log(`👤 Processing: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      
      // Initialize role tracking
      if (!analysis.usersByRole[user.role]) {
        analysis.usersByRole[user.role] = {
          count: 0,
          users: [],
          issues: []
        };
      }
      analysis.usersByRole[user.role].count++;
      analysis.usersByRole[user.role].users.push(user);
      
      // 5. Check user's group assignments
      const groupAssignmentsResult = await client.query(`
        SELECT ug.name as group_name, ug.id as group_id, ug.permissions
        FROM "User_UserGroup" uug
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE uug."userId" = $1
      `, [user.id]);
      
      const groupAssignments = groupAssignmentsResult.rows;
      
      // 6. Check if user has correct group assignment
      const expectedGroupId = ROLE_TO_GROUP_ID[user.role];
      const hasCorrectGroup = groupAssignments.some(assignment => assignment.group_id === expectedGroupId);
      
      if (!hasCorrectGroup) {
        const issue = {
          type: 'MISSING_GROUP_ASSIGNMENT',
          user: user,
          expectedGroup: user.role,
          expectedGroupId: expectedGroupId,
          currentGroups: groupAssignments.map(g => g.group_name)
        };
        
        analysis.issues.push(issue);
        analysis.usersByRole[user.role].issues.push(issue);
        
        console.log(`   ❌ Missing group assignment for role '${user.role}'`);
        console.log(`      Expected: ${user.role} group (${expectedGroupId})`);
        console.log(`      Current: ${groupAssignments.length > 0 ? groupAssignments.map(g => g.group_name).join(', ') : 'None'}`);
        
        // Fix the assignment
        if (expectedGroupId) {
          console.log(`   🔧 Fixing group assignment...`);
          try {
            await client.query(`
              INSERT INTO "User_UserGroup" ("userId", "groupId")
              VALUES ($1, $2)
              ON CONFLICT ("userId", "groupId") DO NOTHING
            `, [user.id, expectedGroupId]);
            
            console.log(`   ✅ Assigned to ${user.role} group`);
            analysis.fixedUsers++;
          } catch (error) {
            console.log(`   ❌ Failed to assign to group: ${error.message}`);
          }
        }
      } else {
        console.log(`   ✅ Correct group assignment: ${user.role}`);
      }
      
      // 7. Check user's actual permissions
      const userPermissionsResult = await client.query(`
        SELECT array_agg(DISTINCT perm) AS user_permissions
        FROM (
          SELECT unnest(permissions) AS perm
          FROM "UserGroup" ug
          JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
          WHERE uug."userId" = $1
        ) AS perms
      `, [user.id]);
      
      const userPermissions = userPermissionsResult.rows[0]?.user_permissions || [];
      const expectedPermissions = expectedPermissionsByRole[user.role] || [];
      
      console.log(`   Permissions: ${userPermissions.length} actual vs ${expectedPermissions.length} expected`);
      
      // Check for missing permissions
      const missingPermissions = expectedPermissions.filter(perm => !userPermissions.includes(perm));
      const extraPermissions = userPermissions.filter(perm => !expectedPermissions.includes(perm));
      
      if (missingPermissions.length > 0) {
        const issue = {
          type: 'MISSING_PERMISSIONS',
          user: user,
          missingPermissions: missingPermissions
        };
        
        analysis.issues.push(issue);
        analysis.usersByRole[user.role].issues.push(issue);
        
        console.log(`   ⚠️  Missing permissions: ${missingPermissions.join(', ')}`);
      }
      
      if (extraPermissions.length > 0) {
        console.log(`   ℹ️  Extra permissions: ${extraPermissions.join(', ')}`);
      }
      
      console.log('');
    }
    
    // 8. Generate summary report
    console.log('📊 SUMMARY REPORT');
    console.log('================');
    console.log(`Total Users: ${analysis.totalUsers}`);
    console.log(`Users Fixed: ${analysis.fixedUsers}`);
    console.log(`Total Issues: ${analysis.issues.length}`);
    console.log('');
    
    console.log('👥 Users by Role:');
    Object.entries(analysis.usersByRole).forEach(([role, data]) => {
      console.log(`  ${role}: ${data.count} users`);
      if (data.issues.length > 0) {
        console.log(`    Issues: ${data.issues.length}`);
        data.issues.forEach(issue => {
          if (issue.type === 'MISSING_GROUP_ASSIGNMENT') {
            console.log(`      - ${issue.user.name}: Missing ${issue.expectedGroup} group assignment`);
          } else if (issue.type === 'MISSING_PERMISSIONS') {
            console.log(`      - ${issue.user.name}: Missing ${issue.missingPermissions.length} permissions`);
          }
        });
      }
    });
    console.log('');
    
    // 9. Verify group counts
    console.log('📈 Group Membership Counts:');
    for (const [role, groupId] of Object.entries(ROLE_TO_GROUP_ID)) {
      const groupCountResult = await client.query(`
        SELECT COUNT(*) as count
        FROM "User_UserGroup"
        WHERE "groupId" = $1
      `, [groupId]);
      
      const count = parseInt(groupCountResult.rows[0].count);
      console.log(`  ${role}: ${count} users`);
    }
    console.log('');
    
    // 10. Show expected permissions for each role
    console.log('🔐 Expected Permissions by Role:');
    Object.entries(expectedPermissionsByRole).forEach(([role, permissions]) => {
      console.log(`  ${role}: ${permissions.length} permissions`);
      console.log(`    ${permissions.join(', ')}`);
      console.log('');
    });
    
    if (analysis.issues.length === 0) {
      console.log('✅ All users have correct role permissions!');
    } else {
      console.log('⚠️  Issues found and fixed. Please review the summary above.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying user role permissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAllUserRolePermissions().catch(console.error);
